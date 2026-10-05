import { cookies, headers } from "next/headers";
import { z } from "zod";
import { analyzeConversation } from "@/lib/ai/analyze";
import { BUSINESS_TYPES, LANGUAGES } from "@/lib/ai/types";
import { AppError } from "@/lib/errors";
import { body, json, route } from "@/lib/server/api";
import { getBusiness, getUser } from "@/lib/server/context";
import { hashIp, randomId, sign, unsign } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { supabaseAdmin } from "@/lib/supabase/server";

const VISITOR_COOKIE = "fu_vid";
const MAX_CHARS = 4000;

const schema = z.object({
  businessType: z.enum(BUSINESS_TYPES),
  language: z.enum(LANGUAGES),
  message: z.string(),
});

type Quota = { key: string; ipHash: string | null; limit: number; window: string; visitorId: string; scope: "visitor" | "account" };

/**
 * Visitors: 5 analyses total, tracked server-side by a signed cookie AND a hashed IP,
 * so clearing cookies doesn't reset the limit. Signed-in owners: a daily account allowance.
 */
async function quota(): Promise<Quota> {
  const user = await getUser();
  if (user) {
    return {
      key: `user:${user.id}`,
      ipHash: null,
      limit: env.analyzerUserDailyLimit(),
      window: "1 day",
      visitorId: `u_${hashIp(user.id).slice(0, 12)}`,
      scope: "account",
    };
  }
  const store = await cookies();
  let vid = unsign(store.get(VISITOR_COOKIE)?.value);
  if (!vid) {
    vid = randomId(12);
    store.set(VISITOR_COOKIE, sign(vid), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return {
    key: `visitor:${vid}`,
    ipHash: ip ? hashIp(ip) : null,
    limit: env.analyzerVisitorLimit(),
    window: "100 years",
    visitorId: vid,
    scope: "visitor",
  };
}

async function used(q: Quota): Promise<number> {
  const admin = supabaseAdmin();
  const since = q.window === "1 day" ? new Date(Date.now() - 86_400_000).toISOString() : "1970-01-01";
  const byKey = await admin.from("usage_events").select("id", { count: "exact", head: true }).eq("usage_key", q.key).gt("created_at", since);
  if (byKey.error) throw new AppError("supabase_unavailable", byKey.error.message);
  let n = byKey.count ?? 0;
  if (q.ipHash) {
    const byIp = await admin.from("usage_events").select("id", { count: "exact", head: true }).eq("ip_hash", q.ipHash).gt("created_at", since);
    if (byIp.error) throw new AppError("supabase_unavailable", byIp.error.message);
    n = Math.max(n, byIp.count ?? 0);
  }
  return n;
}

export const GET = route("analyze.usage", async () => {
  const q = await quota();
  const n = await used(q);
  return json({ limit: q.limit, remaining: Math.max(0, q.limit - n), scope: q.scope });
});

export const POST = route("analyze", async (req) => {
  const input = await body(req, schema);
  const message = input.message.trim();
  if (!message) throw new AppError("empty_message");
  if (message.length > MAX_CHARS) throw new AppError("message_too_long");

  const q = await quota();
  const admin = supabaseAdmin();
  const reserved = await admin.rpc("reserve_usage", {
    p_key: q.key,
    p_ip_hash: q.ipHash,
    p_limit: q.limit,
    p_window: q.window,
  });
  if (reserved.error) throw new AppError("supabase_unavailable", reserved.error.message);
  if ((reserved.data as number) < 0) throw new AppError("rate_limited");

  // Signed-in owners get their own business facts; visitors analyze without any.
  const business = q.scope === "account" ? await getBusiness() : null;

  let analysis;
  try {
    analysis = await analyzeConversation({
      businessType: input.businessType,
      preferredLanguage: input.language,
      facts: business?.facts ?? "",
      messages: [{ role: "customer", text: message }],
      maxOutputTokens: 200,
    });
  } catch (e) {
    // A failed analysis shouldn't cost the visitor one of their requests.
    await admin.rpc("release_usage", { p_key: q.key });
    throw e;
  }

  const output = {
    intent: analysis.intent,
    requestType: analysis.requestType,
    priority: analysis.priority,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    blocker: analysis.blocker,
    suggestedReply: analysis.suggestedReply,
    nextAction: analysis.nextAction,
    replyLanguage: analysis.replyLanguage,
    needsReview: analysis.needsReview,
    reviewReason: analysis.reviewReason,
  };

  const logged = await admin.from("ai_exchanges").insert({
    input: message,
    output,
    input_tokens: analysis.inputTokens,
    output_tokens: analysis.outputTokens,
    shop_type: input.businessType,
    language: input.language,
    request_type: analysis.requestType,
    visitor_id: q.visitorId,
    source: "analyzer",
  });
  if (logged.error) throw new AppError("supabase_unavailable", logged.error.message);

  return json({ analysis: output, remaining: reserved.data as number, limit: q.limit });
});
