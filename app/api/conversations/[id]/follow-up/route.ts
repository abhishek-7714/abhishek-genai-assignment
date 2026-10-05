import { z } from "zod";
import { AppError } from "@/lib/errors";
import { body, dbOk, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";

const schema = z.object({
  action: z.string().trim().min(1).max(300),
  dueAt: z.string().datetime({ offset: true }),
});

/** Sets (or replaces) the conversation's follow-up. Reminders only — nothing is sent. */
export const POST = route<{ params: Promise<{ id: string }> }>("followup.create", async (req, { params }) => {
  const { id } = await params;
  const { supabase, business } = await requireWorkspace();
  const input = await body(req, schema);

  const conv = dbOk(await supabase.from("conversations").select("id").eq("id", id).maybeSingle());
  if (!conv) throw new AppError("not_found");

  dbOk(await supabase.from("follow_ups").update({ status: "cancelled" }).eq("conversation_id", id).eq("status", "open"));
  const row = dbOk(
    await supabase
      .from("follow_ups")
      .insert({ conversation_id: id, business_id: business.id, action: input.action, due_at: new Date(input.dueAt).toISOString() })
      .select("*")
      .single(),
  );
  return json({ followUp: row }, 201);
});
