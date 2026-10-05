import { z } from "zod";
import { AppError } from "@/lib/errors";
import { body, json, route } from "@/lib/server/api";
import { getBusiness, getUser } from "@/lib/server/context";
import { disconnectGmail } from "@/lib/server/gmail";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

/** Permanently deletes the account: revokes Gmail, then removes the user (all data cascades). */
export const DELETE = route("account.delete", async (req) => {
  const user = await getUser();
  if (!user) throw new AppError("unauthorized");
  const { confirm } = await body(req, z.object({ confirm: z.literal("DELETE") }));
  void confirm;
  const business = await getBusiness();
  if (business) await disconnectGmail(business).catch(() => undefined);
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) throw new AppError("supabase_unavailable", error.message);
  await (await supabaseServer()).auth.signOut();
  return json({ ok: true });
});
