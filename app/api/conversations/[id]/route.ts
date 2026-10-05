import { z } from "zod";
import { PRIORITIES } from "@/lib/ai/types";
import { AppError } from "@/lib/errors";
import { body, dbOk, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";

const schema = z.object({
  priorityOverride: z.enum(PRIORITIES).nullable().optional(),
  state: z.enum(["needs_attention", "waiting_customer", "resolved"]).optional(),
  analysisDismissed: z.boolean().optional(),
});

/** Owner overrides: priority, dismiss analysis, resolve / reopen. */
export const PATCH = route<{ params: Promise<{ id: string }> }>("conversation.patch", async (req, { params }) => {
  const { id } = await params;
  const { supabase } = await requireWorkspace();
  const input = await body(req, schema);

  const patch: Record<string, unknown> = {};
  if (input.priorityOverride !== undefined) patch.priority_override = input.priorityOverride;
  if (input.state !== undefined) patch.state = input.state;
  if (input.analysisDismissed !== undefined) patch.analysis_dismissed = input.analysisDismissed;
  if (!Object.keys(patch).length) throw new AppError("invalid_input");

  const rows = dbOk(await supabase.from("conversations").update(patch).eq("id", id).select("id")) as { id: string }[];
  if (!rows.length) throw new AppError("not_found");

  // Resolving closes any open follow-up (cancelled, not counted as completed).
  if (input.state === "resolved") {
    dbOk(await supabase.from("follow_ups").update({ status: "cancelled" }).eq("conversation_id", id).eq("status", "open"));
  }
  return json({ ok: true });
});
