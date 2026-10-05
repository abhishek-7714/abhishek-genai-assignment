"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client — only the public anon key, always constrained by RLS. */
export function supabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
