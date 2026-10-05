import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/server/log";

/** Completes email confirmation and password-reset links (PKCE code exchange). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/app";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    log("auth.failed", { step: "code_exchange", message: error.message });
  }
  return NextResponse.redirect(new URL("/login?error=session", url.origin));
}
