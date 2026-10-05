import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getBusiness, getUser } from "@/lib/server/context";
import { unsign } from "@/lib/server/crypto";
import { connectGmail } from "@/lib/server/gmail";
import { errMessage, log } from "@/lib/server/log";

/** Google redirects here after consent. Verifies state, stores encrypted tokens, never exposes them. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (status: string) => NextResponse.redirect(new URL(`/app/settings?gmail=${status}#gmail`, url.origin));
  const store = await cookies();
  const cookieState = store.get("fu_gstate")?.value;
  store.delete("fu_gstate");

  if (url.searchParams.get("error")) {
    log("gmail.oauth_failed", { reason: url.searchParams.get("error") });
    return back("denied");
  }

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=session", url.origin));

  const state = url.searchParams.get("state");
  const payload = unsign(state ?? undefined);
  const [uid, , ts] = payload?.split(".") ?? [];
  if (!state || state !== cookieState || uid !== user.id || Date.now() - Number(ts) > 600_000) {
    log("gmail.oauth_failed", { reason: "state_mismatch" });
    return back("failed");
  }

  const code = url.searchParams.get("code");
  const business = await getBusiness();
  if (!code || !business) return back("failed");

  try {
    await connectGmail(business, code);
  } catch (e) {
    log("gmail.oauth_failed", { reason: e instanceof AppError ? e.internal ?? e.code : errMessage(e) });
    return back(e instanceof AppError && e.internal === "missing scopes" ? "scopes" : "failed");
  }
  return back("connected");
}
