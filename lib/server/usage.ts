import "server-only";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Account-level AI allowance for in-app analysis. Same atomic counter as the public
 * analyzer, keyed by business, so plan-based limits can be added later without new plumbing.
 */
export async function reserveAppAnalysis(businessId: string) {
  const limit = Number(process.env.APP_DAILY_ANALYSIS_LIMIT ?? 200);
  const res = await supabaseAdmin().rpc("reserve_usage", { p_key: `app:${businessId}`, p_ip_hash: null, p_limit: limit, p_window: "1 day" });
  if (res.error) throw new AppError("supabase_unavailable", res.error.message);
  if ((res.data as number) < 0) throw new AppError("rate_limited", "app daily limit");
}

export async function releaseAppAnalysis(businessId: string) {
  await supabaseAdmin().rpc("release_usage", { p_key: `app:${businessId}` });
}
