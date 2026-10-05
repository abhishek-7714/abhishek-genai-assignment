import { z } from "zod";
import { REDRAFT_STYLES } from "@/lib/ai/prompt";
import { body, json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { analyzeAndStore } from "@/lib/server/conversations";
import { releaseAppAnalysis, reserveAppAnalysis } from "@/lib/server/usage";

const schema = z.object({ style: z.enum(Object.keys(REDRAFT_STYLES) as [keyof typeof REDRAFT_STYLES]).optional() });

/** (Re-)analyze a conversation. Style is a fixed key — clients never send prompt text. */
export const POST = route<{ params: Promise<{ id: string }> }>("conversation.analyze", async (req, { params }) => {
  const { id } = await params;
  const { supabase, business } = await requireWorkspace();
  const { style } = await body(req, schema);
  await reserveAppAnalysis(business.id);
  try {
    const analysis = await analyzeAndStore(supabase, business, id, { style });
    return json({ analysis });
  } catch (e) {
    await releaseAppAnalysis(business.id);
    throw e;
  }
});
