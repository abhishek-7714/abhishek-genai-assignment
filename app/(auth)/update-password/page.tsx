import { AuthShell } from "@/components/app/AuthShell";
import { UpdatePasswordForm } from "@/components/app/AuthForms";

export const metadata = { title: "Choose a new password — FollowUpOS" };

export default function UpdatePasswordPage() {
  return (
    <AuthShell title="Choose a new password." subtitle="You’ll be signed in once it’s saved.">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
