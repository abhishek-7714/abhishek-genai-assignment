import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBusiness, getUser } from "@/lib/server/context";
import { randomId, sign } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { authUrl } from "@/lib/server/gmail";

const STATE_COOKIE = "fu_gstate";

/** Starts Gmail OAuth. State is signed and bound to this user and an httpOnly cookie. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/app/settings", origin));
  if (!(await getBusiness())) return NextResponse.redirect(new URL("/onboarding", origin));
  if (!env.isConfigured.gmail()) return NextResponse.redirect(new URL("/app/settings?gmail=not_configured#gmail", origin));

  const state = sign(`${user.id}.${randomId(12)}.${Date.now()}`);
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(authUrl(state));
}
