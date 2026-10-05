import { z } from "zod";
import { BUSINESS_TYPES, LANGUAGES } from "@/lib/ai/types";
import { AppError } from "@/lib/errors";
import { body, dbOk, json, route } from "@/lib/server/api";
import { getUser, requireWorkspace } from "@/lib/server/context";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  businessType: z.enum(BUSINESS_TYPES),
  language: z.enum(LANGUAGES),
  facts: z.string().max(4000).default(""),
});

export const POST = route("business.create", async (req) => {
  const user = await getUser();
  if (!user) throw new AppError("unauthorized");
  const input = await body(req, schema);
  const supabase = await supabaseServer();
  const row = dbOk(
    await supabase
      .from("businesses")
      .upsert(
        { owner_id: user.id, name: input.name, business_type: input.businessType, language: input.language, facts: input.facts.trim() },
        { onConflict: "owner_id" },
      )
      .select("id")
      .single(),
  );
  return json({ business: row }, 201);
});

export const PATCH = route("business.update", async (req) => {
  const { business, supabase } = await requireWorkspace();
  const input = await body(req, schema.partial());
  const patch: Record<string, string> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.businessType !== undefined) patch.business_type = input.businessType;
  if (input.language !== undefined) patch.language = input.language;
  if (input.facts !== undefined) patch.facts = input.facts.trim();
  dbOk(await supabase.from("businesses").update(patch).eq("id", business.id));
  return json({ ok: true });
});
