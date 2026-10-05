import "server-only";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { supabaseServer } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

/** The signed-in user, or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getBusiness = cache(async (): Promise<Business | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
  if (error) throw new AppError("supabase_unavailable", error.message);
  return data as Business | null;
});

/** For API routes: a signed-in owner with a business, or a typed error. */
export async function requireWorkspace() {
  const user = await getUser();
  if (!user) throw new AppError("unauthorized");
  const business = await getBusiness();
  if (!business) throw new AppError("not_found", "no business");
  const supabase = await supabaseServer();
  return { user, business, supabase };
}
