import { z } from "zod";
import { AppError } from "@/lib/errors";
import { body, dbOk, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";

const schema = z.object({
  op: z.enum(["complete", "snooze", "cancel"]),
  until: z.string().datetime({ offset: true }).optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>("followup.update", async (req, { params }) => {
  const { id } = await params;
  const { supabase } = await requireWorkspace();
  const { op, until } = await body(req, schema);

  const f = dbOk(await supabase.from("follow_ups").select("*").eq("id", id).eq("status", "open").maybeSingle()) as {
    due_at: string;
    snooze_count: number;
  } | null;
  if (!f) throw new AppError("not_found");

  let patch: Record<string, unknown>;
  if (op === "complete") patch = { status: "done", completed_at: new Date().toISOString() };
  else if (op === "cancel") patch = { status: "cancelled" };
  else {
    const base = Math.max(Date.now(), new Date(f.due_at).getTime());
    patch = { due_at: until ?? new Date(base + 86_400_000).toISOString(), snooze_count: f.snooze_count + 1 };
  }
  dbOk(await supabase.from("follow_ups").update(patch).eq("id", id));
  return json({ ok: true });
});
