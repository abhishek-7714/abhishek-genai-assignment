import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeConversation } from "@/lib/ai/analyze";
import type { RedraftStyle } from "@/lib/ai/prompt";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Business, Conversation, ConversationAnalysis, ConversationState, ConversationWithSignal, FollowUp, Message } from "@/lib/types";
import { dbOk } from "./api";
import { hashIp } from "./crypto";

const SELECT = "*, analysis:conversation_analyses!conversations_latest_analysis_fk(*), follow_ups(*)";

type Row = Conversation & { analysis: ConversationAnalysis | null; follow_ups: FollowUp[] };

function shape(row: Row): ConversationWithSignal {
  const { follow_ups, ...rest } = row;
  const open = (follow_ups ?? []).find((f) => f.status === "open") ?? null;
  return { ...rest, analysis: row.analysis ?? null, follow_up: open };
}

/** All conversations for the owner's business, with latest signal and open follow-up. RLS-scoped. */
export async function listConversations(supabase: SupabaseClient, opts: { includeResolved?: boolean } = {}) {
  let q = supabase.from("conversations").select(SELECT).order("last_message_at", { ascending: false }).limit(500);
  if (!opts.includeResolved) q = q.neq("state", "resolved");
  const rows = dbOk(await q) as Row[];
  return rows.map(shape);
}

export async function getConversation(supabase: SupabaseClient, id: string) {
  const row = dbOk(await supabase.from("conversations").select(SELECT).eq("id", id).maybeSingle()) as Row | null;
  if (!row) throw new AppError("not_found");
  const messages = dbOk(
    await supabase.from("messages").select("*").eq("conversation_id", id).order("sent_at", { ascending: true }),
  ) as Message[];
  return { conversation: shape(row), messages };
}

/** State after a fresh analysis: owner's turn if the customer spoke last. */
export function stateAfterAnalysis(c: Pick<Conversation, "state" | "last_direction">): ConversationState {
  if (c.state === "resolved") return "resolved";
  if (c.last_direction === "outbound") return "waiting_customer";
  return "needs_attention";
}

/**
 * Runs the shared analysis pipeline on a stored conversation and persists the result.
 * Analyses are written with the service role (owners can't forge them) after the caller
 * has verified ownership through an RLS-scoped read.
 */
export async function analyzeAndStore(
  supabase: SupabaseClient,
  business: Business,
  conversationId: string,
  opts: { style?: RedraftStyle } = {},
) {
  const { conversation, messages } = await getConversation(supabase, conversationId);

  const recent = messages.slice(-12);
  const analysis = await analyzeConversation({
    businessType: business.business_type,
    preferredLanguage: business.language,
    facts: business.facts,
    messages: recent.map((m) => ({
      role: m.direction === "inbound" ? "customer" : "owner",
      text: m.body.slice(0, 3000),
      at: new Date(m.sent_at).toISOString().slice(0, 16).replace("T", " "),
    })),
    maxOutputTokens: 400,
    style: opts.style,
  });

  const admin = supabaseAdmin();
  const inserted = dbOk(
    await admin
      .from("conversation_analyses")
      .insert({
        conversation_id: conversation.id,
        business_id: business.id,
        intent: analysis.intent,
        request_type: analysis.requestType,
        priority: analysis.priority,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        blocker: analysis.blocker,
        suggested_reply: analysis.suggestedReply,
        next_action: analysis.nextAction,
        reply_language: analysis.replyLanguage,
        needs_review: analysis.needsReview,
        review_reason: analysis.reviewReason,
        model: analysis.model,
        input_tokens: analysis.inputTokens,
        output_tokens: analysis.outputTokens,
      })
      .select("*")
      .single(),
  ) as ConversationAnalysis;

  dbOk(
    await admin
      .from("conversations")
      .update({
        latest_analysis_id: inserted.id,
        needs_analysis: false,
        analysis_dismissed: false,
        state: stateAfterAnalysis(conversation),
      })
      .eq("id", conversation.id),
  );

  // Assignment log: token usage and classification only — the customer's email stays with the conversation.
  await admin.from("ai_exchanges").insert({
    input: "[gmail conversation — stored with the conversation, not duplicated here]",
    output: { intent: analysis.intent, requestType: analysis.requestType, priority: analysis.priority, sentiment: analysis.sentiment },
    input_tokens: analysis.inputTokens,
    output_tokens: analysis.outputTokens,
    shop_type: business.business_type,
    language: analysis.replyLanguage,
    request_type: analysis.requestType,
    // Anonymous, stable per business — counts the shop without identifying it.
    visitor_id: `b_${hashIp(business.id).slice(0, 12)}`,
    source: "app",
  });

  return inserted;
}

const RANK = { high: 0, medium: 1, low: 2 } as const;

export function effectivePriority(c: ConversationWithSignal) {
  return c.priority_override ?? c.analysis?.priority ?? null;
}

export function isFollowUpDue(c: ConversationWithSignal, now = Date.now()) {
  return Boolean(c.follow_up && new Date(c.follow_up.due_at).getTime() <= now);
}

/** Owner's attention order: due follow-ups, then priority, then most recent. */
export function sortByAttention(list: ConversationWithSignal[]) {
  const now = Date.now();
  return [...list].sort((a, b) => {
    const da = isFollowUpDue(a, now) ? 0 : 1;
    const db = isFollowUpDue(b, now) ? 0 : 1;
    if (da !== db) return da - db;
    const pa = RANK[effectivePriority(a) ?? "low"] + (a.state === "needs_attention" ? 0 : 3);
    const pb = RANK[effectivePriority(b) ?? "low"] + (b.state === "needs_attention" ? 0 : 3);
    if (pa !== pb) return pa - pb;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
}
