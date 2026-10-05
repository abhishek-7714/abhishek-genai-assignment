"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { api, Banner, Spinner } from "./Status";

type Msg = { tone: "info" | "error"; text: string } | null;

export function AccountSettings({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter();
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("profile");
    const { error } = await supabaseBrowser().auth.updateUser({ data: { full_name: String(new FormData(e.currentTarget).get("name")).trim() } });
    setBusy(null);
    setProfileMsg(error ? { tone: "error", text: "Couldn’t save your name. Try again." } : { tone: "info", text: "Saved." });
    if (!error) router.refresh();
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const pw = String(new FormData(form).get("password"));
    if (pw.length < 8) return setPwMsg({ tone: "error", text: "Use at least 8 characters." });
    setBusy("pw");
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(null);
    if (error) return setPwMsg({ tone: "error", text: /session|reauth/i.test(error.message) ? "Sign in again, then change your password." : "Couldn’t update your password." });
    form.reset();
    setPwMsg({ tone: "info", text: "Password updated." });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form className="ui-card ui-card-pad ui-form" onSubmit={saveProfile}>
        <div className="ui-field">
          <label htmlFor="acct-name">Your name</label>
          <input id="acct-name" name="name" className="ui-input" defaultValue={fullName} maxLength={80} />
        </div>
        <div className="ui-field">
          <label htmlFor="acct-email">Email</label>
          <input id="acct-email" className="ui-input" value={email} readOnly aria-readonly="true" />
        </div>
        {profileMsg && <Banner tone={profileMsg.tone}>{profileMsg.text}</Banner>}
        <button className="btn btn-dark btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy !== null}>
          {busy === "profile" ? <Spinner label="Saving…" /> : "Save profile"}
        </button>
      </form>

      <form className="ui-card ui-card-pad ui-form" onSubmit={changePassword}>
        <div className="ui-field">
          <label htmlFor="acct-pw">New password</label>
          <input id="acct-pw" name="password" type="password" autoComplete="new-password" minLength={8} className="ui-input" required />
        </div>
        {pwMsg && <Banner tone={pwMsg.tone}>{pwMsg.text}</Banner>}
        <button className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy !== null}>
          {busy === "pw" ? <Spinner label="Updating…" /> : "Change password"}
        </button>
      </form>

      <div className="ui-card ui-card-pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <form action="/auth/signout" method="post">
          <button className="btn btn-outline btn-sm">Sign out</button>
        </form>
        <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
          Delete account
        </button>
      </div>

      <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function DeleteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setTyped("");
      setError(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function remove() {
    setBusy(true);
    const res = await api("/api/account", { method: "DELETE", json: { confirm: typed } });
    setBusy(false);
    if (res.error) return setError(res.error.detail);
    window.location.href = "/";
  }

  return (
    <dialog ref={ref} className="ui-dialog" onClose={onClose} aria-labelledby="del-title">
      <div className="ui-dialog-body">
        <h2 id="del-title" className="ui-h2">
          Delete your account?
        </h2>
        <p className="ui-muted" style={{ fontSize: "0.92rem", lineHeight: 1.55 }}>
          This permanently deletes your business, conversations, follow-ups and analyses, and disconnects Gmail. It can’t be undone.
        </p>
        <div className="ui-field">
          <label htmlFor="del-confirm">Type DELETE to confirm</label>
          <input id="del-confirm" className="ui-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
        {error && <Banner tone="error">{error}</Banner>}
        <div className="ui-dialog-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" disabled={typed !== "DELETE" || busy} onClick={remove}>
            {busy ? <Spinner label="Deleting…" /> : "Delete account"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
