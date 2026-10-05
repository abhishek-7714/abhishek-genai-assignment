import { redirect } from "next/navigation";
import { AuthShell } from "@/components/app/AuthShell";
import { OnboardingForm } from "./OnboardingForm";
import { getBusiness, getUser } from "@/lib/server/context";
import "../ui.css";

export const metadata = { title: "Set up your workspace — FollowUpOS" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");
  if (await getBusiness()) redirect("/app");
  return (
    <AuthShell title="Tell us about your business." subtitle="FollowUpOS uses this to understand your customers and draft replies you can trust.">
      <OnboardingForm />
    </AuthShell>
  );
}
