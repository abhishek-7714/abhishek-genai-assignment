import Link from "next/link";
import { AuthShell } from "@/components/app/AuthShell";
import { SignupForm } from "@/components/app/AuthForms";

export const metadata = { title: "Create your account — FollowUpOS" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Stop losing customers in your inbox."
      subtitle="Create your FollowUpOS workspace. It takes about a minute."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
