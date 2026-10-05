import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbOk } from "./api";

type Count = { key: string; count: number };

const tally = (values: (string | null | undefined)[]): Count[] => {
  const m = new Map<string, number>();
  values.forEach((v) => v && m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

/** Business analytics, computed from stored data only. Demo rows are excluded unless asked for. */
export async function businessAnalytics(supabase: SupabaseClient, includeDemo: boolean) {
  let convQ = supabase
    .from("conversations")
    .select("id, state, priority_override, is_demo, analysis:conversation_analyses!conversations_latest_analysis_fk(priority, request_type, reply_language)");
  if (!includeDemo) convQ = convQ.eq("is_demo", false);
  const convs = dbOk(await convQ.limit(2000)) as unknown as {
    id: string;
    state: string;
    priority_override: string | null;
    is_demo: boolean;
    analysis: { priority: string; request_type: string; reply_language: string } | null;
  }[];

  let anQ = supabase.from("conversation_analyses").select("conversation_id, input_tokens, output_tokens, is_demo");
  if (!includeDemo) anQ = anQ.eq("is_demo", false);
  const analyses = dbOk(await anQ.limit(5000)) as { conversation_id: string; input_tokens: number | null; output_tokens: number | null }[];

  let fuQ = supabase.from("follow_ups").select("status, due_at, conversation:conversations(is_demo)");
  const followUps = (dbOk(await fuQ.limit(5000)) as unknown as { status: string; due_at: string; conversation: { is_demo: boolean } | null }[]).filter(
    (f) => includeDemo || !f.conversation?.is_demo,
  );

  let msgQ = supabase.from("messages").select("conversation_id, direction, sent_at").order("sent_at", { ascending: true });
  if (!includeDemo) msgQ = msgQ.eq("is_demo", false);
  const messages = dbOk(await msgQ.limit(10000)) as { conversation_id: string; direction: string; sent_at: string }[];

  // Response time: inbound message → the owner's next outbound reply in the same conversation.
  const byConv = new Map<string, typeof messages>();
  messages.forEach((m) => byConv.set(m.conversation_id, [...(byConv.get(m.conversation_id) ?? []), m]));
  const gaps: number[] = [];
  byConv.forEach((list) => {
    let waitingSince: number | null = null;
    for (const m of list) {
      const t = new Date(m.sent_at).getTime();
      if (m.direction === "inbound" && waitingSince === null) waitingSince = t;
      if (m.direction === "outbound" && waitingSince !== null) {
        gaps.push(t - waitingSince);
        waitingSince = null;
      }
    }
  });

  const now = Date.now();
  const analyzed = convs.filter((c) => c.analysis);
  const tokens = analyses.filter((a) => a.input_tokens != null);

  return {
    conversations: convs.length,
    analyzed: new Set(analyses.map((a) => a.conversation_id)).size,
    highIntent: convs.filter((c) => (c.priority_override ?? c.analysis?.priority) === "high").length,
    resolved: convs.filter((c) => c.state === "resolved").length,
    followUpsCompleted: followUps.filter((f) => f.status === "done").length,
    followUpsOverdue: followUps.filter((f) => f.status === "open" && new Date(f.due_at).getTime() <= now).length,
    avgResponseMs: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    responseSamples: gaps.length,
    requestTypes: tally(analyzed.map((c) => c.analysis!.request_type)),
    languages: tally(analyzed.map((c) => c.analysis!.reply_language)),
    avgInputTokens: tokens.length ? tokens.reduce((a, t) => a + (t.input_tokens ?? 0), 0) / tokens.length : null,
    avgOutputTokens: tokens.length ? tokens.reduce((a, t) => a + (t.output_tokens ?? 0), 0) / tokens.length : null,
  };
}

/** Assignment read-back metrics across every FollowUpOS AI exchange (no PII involved). */
export async function readback() {
  const { data, error } = await supabaseAdmin().rpc("analyzer_readback");
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as {
    shops: number;
    languages: number;
    shop_types: number;
    top_request_type: string | null;
    top_request_count: number | null;
    exchanges: number;
    avg_input_tokens: number | null;
    avg_output_tokens: number | null;
  } | null;
  return row;
}
