import { AppError } from "@/lib/errors";
import { dbOk, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { analyzeAndStore } from "@/lib/server/conversations";
import { env } from "@/lib/server/env";
import { releaseAppAnalysis, reserveAppAnalysis } from "@/lib/server/usage";

export const maxDuration = 60;
const BATCH = 3;

/** Staged analysis: a few newly synced conversations per call, newest first. */
export const POST = route("conversations.analyze_pending", async () => {
  const { supabase, business } = await requireWorkspace();
  if (!env.isConfigured.gemini()) throw new AppError("ai_not_configured");

  const pending = dbOk(
    await supabase
      .from("conversations")
      .select("id")
      .eq("needs_analysis", true)
      .eq("is_demo", false)
      .order("last_message_at", { ascending: false })
      .limit(BATCH),
  ) as { id: string }[];

  let analyzed = 0;
  for (const { id } of pending) {
    await reserveAppAnalysis(business.id);
    try {
      await analyzeAndStore(supabase, business, id);
      analyzed++;
    } catch (e) {
      await releaseAppAnalysis(business.id);
      throw e;
    }
  }

  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("needs_analysis", true)
    .eq("is_demo", false);
  return json({ analyzed, remaining: count ?? 0 });
});
