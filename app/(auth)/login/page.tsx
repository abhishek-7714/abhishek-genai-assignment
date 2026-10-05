import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/app/AuthShell";
import { LoginForm } from "@/components/app/AuthForms";

export const metadata = { title: "Sign in — FollowUpOS" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back."
      subtitle="See who needs your attention today."
      footer={
        <>
          New to FollowUpOS? <Link href="/signup">Create an account</Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
