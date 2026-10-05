import { json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { clearDemo, loadDemo } from "@/lib/server/demo";

/** Load sample conversations into the owner's workspace (clearly marked as demo). */
export const POST = route("demo.load", async () => {
  const { business } = await requireWorkspace();
  await loadDemo(business);
  return json({ ok: true });
});

/** Remove every demo conversation. Real Gmail conversations are never touched. */
export const DELETE = route("demo.clear", async () => {
  const { business } = await requireWorkspace();
  await clearDemo(business);
  return json({ ok: true });
});
