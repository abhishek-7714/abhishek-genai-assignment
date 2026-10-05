import Link from "next/link";
import { AuthShell } from "@/components/app/AuthShell";
import { ResetForm } from "@/components/app/AuthForms";

export const metadata = { title: "Reset password — FollowUpOS" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password."
      subtitle="We’ll email you a link to choose a new one."
      footer={
        <>
          Remembered it? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <ResetForm />
    </AuthShell>
  );
}
