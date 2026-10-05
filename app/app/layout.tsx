import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { FatalState } from "@/components/app/FatalState";
import { AppError } from "@/lib/errors";
import { getBusiness, getUser } from "@/lib/server/context";
import { supabaseServer } from "@/lib/supabase/server";
import "../ui.css";

export const metadata = { title: "FollowUpOS" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user, business;
  try {
    user = await getUser();
    if (!user) redirect("/login?next=/app");
    business = await getBusiness();
  } catch (e) {
    if (e instanceof AppError) return <FatalState code={e.code} />;
    throw e;
  }
  if (!business) redirect("/onboarding");

  const supabase = await supabaseServer();
  const [gmail, attention, due] = await Promise.all([
    supabase.from("gmail_connections").select("email").eq("business_id", business.id).maybeSingle(),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("state", "needs_attention"),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("status", "open").lte("due_at", new Date().toISOString()),
  ]);

  return (
    <AppShell
      businessName={business.name}
      ownerName={(user.user_metadata?.full_name as string) || ""}
      ownerEmail={user.email ?? ""}
      gmailEmail={gmail.data?.email ?? null}
      counts={{ attention: attention.count ?? 0, due: due.count ?? 0 }}
    >
      {children}
    </AppShell>
  );
}
