import { json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { disconnectGmail } from "@/lib/server/gmail";

/** Disconnect: revokes Google access and deletes stored credentials. Imported conversations remain. */
export const DELETE = route("gmail.disconnect", async () => {
  const { business } = await requireWorkspace();
  await disconnectGmail(business);
  return json({ ok: true });
});
