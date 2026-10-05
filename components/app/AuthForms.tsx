"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Banner, Spinner } from "./Status";

type Err = { title: string; detail: string } | null;

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function friendly(message: string): { title: string; detail: string } {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return { title: "That email and password don’t match", detail: "Check both and try again, or reset your password." };
  if (m.includes("already registered") || m.includes("already been registered"))
    return { title: "You already have an account", detail: "Sign in instead, or reset your password if you’ve forgotten it." };
  if (m.includes("password")) return { title: "Choose a stronger password", detail: "Use at least 8 characters." };
  if (m.includes("email not confirmed")) return { title: "Confirm your email first", detail: "Open the link we emailed you, then sign in." };
  if (m.includes("rate limit") || m.includes("too many")) return { title: "Too many attempts", detail: "Wait a minute and try again." };
  if (m.includes("fetch") || m.includes("network")) return { title: "We can’t reach FollowUpOS", detail: "Check your connection and try again." };
  return { title: "That didn’t work", detail: "Please try again." };
}

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function NotConfigured() {
  return (
    <Banner tone="warn" title="Accounts aren’t set up on this server yet">
      Add the Supabase environment variables to enable sign-in.
    </Banner>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err>(params.get("error") === "session" ? { title: "Your session expired", detail: "Sign in again to continue." } : null);

  if (!configured) return <NotConfigured />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    router.replace(safeNext(params.get("next"), "/app"));
    router.refresh();
  }

  return (
    <form className="ui-form" onSubmit={submit} noValidate={false}>
      {error && <Banner tone="error" title={error.title}>{error.detail}</Banner>}
      <div className="ui-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="ui-input" />
      </div>
      <div className="ui-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="ui-input" />
        <Link href="/reset-password" className="ui-hint" style={{ alignSelf: "flex-end", textDecoration: "underline" }}>
          Forgot password?
        </Link>
      </div>
      <button className="btn btn-dark btn-block" disabled={busy}>
        {busy ? <Spinner label="Signing in…" /> : "Sign in"}
      </button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);

  if (!configured) return <NotConfigured />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setError({ title: "Choose a stronger password", detail: "Use at least 8 characters." });
    setBusy(true);
    setError(null);
    const email = String(f.get("email"));
    const { data, error } = await supabaseBrowser().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: String(f.get("name") || "").trim() || null },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      setCheckEmail(email);
    }
  }

  if (checkEmail)
    return (
      <Banner title="Check your inbox">
        We sent a confirmation link to {checkEmail}. Open it to finish setting up FollowUpOS.
      </Banner>
    );

  return (
    <form className="ui-form" onSubmit={submit}>
      {error && <Banner tone="error" title={error.title}>{error.detail}</Banner>}
      <div className="ui-field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" className="ui-input" />
      </div>
      <div className="ui-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="ui-input" />
      </div>
      <div className="ui-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="ui-input" aria-describedby="pw-hint" />
        <span id="pw-hint" className="ui-hint">
          At least 8 characters.
        </span>
      </div>
      <button className="btn btn-dark btn-block" disabled={busy}>
        {busy ? <Spinner label="Creating your workspace…" /> : "Create account"}
      </button>
      <p className="ui-hint">You don’t need Gmail to get started — you can connect it later.</p>
    </form>
  );
}

export function ResetForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<Err>(null);

  if (!configured) return <NotConfigured />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setBusy(false);
    // Don't reveal whether the address has an account.
    if (error && /rate|fetch|network/i.test(error.message)) return setError(friendly(error.message));
    setSent(true);
  }

  if (sent)
    return (
      <Banner title="Check your inbox">
        If an account exists for that address, a reset link is on its way. It expires in an hour.
      </Banner>
    );

  return (
    <form className="ui-form" onSubmit={submit}>
      {error && <Banner tone="error" title={error.title}>{error.detail}</Banner>}
      <div className="ui-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="ui-input" />
      </div>
      <button className="btn btn-dark btn-block" disabled={busy}>
        {busy ? <Spinner label="Sending…" /> : "Send reset link"}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err>(null);

  if (!configured) return <NotConfigured />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setError({ title: "Choose a stronger password", detail: "Use at least 8 characters." });
    if (password !== String(f.get("confirm"))) return setError({ title: "Passwords don’t match", detail: "Type the same password twice." });
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      if (/session|jwt|auth/i.test(error.message))
        return setError({ title: "This reset link has expired", detail: "Request a new link and try again." });
      return setError(friendly(error.message));
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <form className="ui-form" onSubmit={submit}>
      {error && <Banner tone="error" title={error.title}>{error.detail}</Banner>}
      <div className="ui-field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="ui-input" />
      </div>
      <div className="ui-field">
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="ui-input" />
      </div>
      <button className="btn btn-dark btn-block" disabled={busy}>
        {busy ? <Spinner label="Saving…" /> : "Save new password"}
      </button>
    </form>
  );
}
