import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "@/lib/server/env";

// Realtime isn't used, but supabase-js constructs it; Node 20 has no native WebSocket.
const realtime = { transport: WebSocket as unknown as typeof globalThis.WebSocket };

/** Session-scoped client: every query runs as the signed-in owner, under RLS. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    realtime,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes cookies instead.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — use only for server-owned tables
 * (gmail_credentials, ai_exchanges, usage_events, analyses) after checking ownership.
 */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime,
  });
}
