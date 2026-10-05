import { z } from "zod";
import { AppError } from "@/lib/errors";
import { body, dbOk, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { getConversation } from "@/lib/server/conversations";
import { sendReply } from "@/lib/server/gmail";

const schema = z.object({ body: z.string().trim().min(1).max(5000) });

/**
 * Sends a reply the owner has reviewed and explicitly confirmed.
 * This is the only path to a customer — nothing calls it automatically.
 */
export const POST = route<{ params: Promise<{ id: string }> }>("conversation.send", async (req, { params }) => {
  const { id } = await params;
  const { supabase, business } = await requireWorkspace();
  const input = await body(req, schema);
  const { conversation: c, messages } = await getConversation(supabase, id);

  const now = new Date().toISOString();
  let gmailId: string | null = null;

  if (!c.is_demo) {
    if (c.source !== "gmail") throw new AppError("invalid_input", "not a gmail conversation");
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
    const sent = await sendReply(business, c, lastInbound?.rfc_message_id ?? null, input.body);
    gmailId = sent.id;
  }

  dbOk(
    await supabase.from("messages").insert({
      conversation_id: c.id,
      business_id: business.id,
      gmail_message_id: gmailId,
      direction: "outbound",
      from_name: business.name,
      to_email: c.customer_email,
      subject: c.subject,
      body: input.body,
      sent_at: now,
      is_demo: c.is_demo,
    }),
  );
  dbOk(
    await supabase
      .from("conversations")
      .update({
        last_message_at: now,
        last_message_preview: input.body.slice(0, 200),
        last_direction: "outbound",
        state: "waiting_customer",
        needs_analysis: false,
      })
      .eq("id", c.id),
  );
  return json({ ok: true, demo: c.is_demo });
});
