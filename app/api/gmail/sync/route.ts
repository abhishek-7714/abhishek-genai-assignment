import { json, route } from "@/lib/server/api";
import { requireWorkspace } from "@/lib/server/context";
import { syncInbox } from "@/lib/server/gmail";

export const maxDuration = 60;

export const POST = route("gmail.sync", async () => {
  const { business, supabase } = await requireWorkspace();
  const result = await syncInbox(supabase, business);
  return json(result);
});
