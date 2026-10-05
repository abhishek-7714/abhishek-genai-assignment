"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ApiErrorBody } from "@/lib/errors";
import { api, ErrorBanner, Spinner } from "./Status";

type Preset = "later" | "tomorrow" | "three" | "custom";

function presetDate(p: Preset): Date {
  const d = new Date();
  if (p === "later") {
    d.setHours(d.getHours() + 3, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() + (p === "tomorrow" ? 1 : 3));
  d.setHours(10, 0, 0, 0);
  return d;
}

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function FollowUpDialog({
  open,
  onClose,
  conversationId,
  defaultAction,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  defaultAction: string;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [preset, setPreset] = useState<Preset>("tomorrow");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorBody["error"] | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setError(null);
      setCustom(toLocalInput(presetDate("tomorrow")));
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const due = preset === "custom" ? new Date(custom) : presetDate(preset);
    if (Number.isNaN(due.getTime())) return;
    setBusy(true);
    const res = await api(`/api/conversations/${conversationId}/follow-up`, {
      method: "POST",
      json: { action: String(f.get("action")), dueAt: due.toISOString() },
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    onSaved();
  }

  const options: [Preset, string][] = [
    ["later", "Later today"],
    ["tomorrow", "Tomorrow, 10 AM"],
    ["three", "In 3 days"],
    ["custom", "Pick a time"],
  ];

  return (
    <dialog ref={ref} className="ui-dialog" onClose={onClose} aria-labelledby="fu-title">
      <form className="ui-dialog-body" onSubmit={submit}>
        <div>
          <h2 id="fu-title" className="ui-h2">
            Set a follow-up
          </h2>
          <p className="ui-muted" style={{ marginTop: 6, fontSize: "0.92rem" }}>
            It will appear in Follow-ups when it’s due. Nothing is sent automatically.
          </p>
        </div>
        <div className="ui-field">
          <label htmlFor="fu-action">What should you do?</label>
          <input id="fu-action" name="action" className="ui-input" defaultValue={defaultAction} required maxLength={300} key={defaultAction} />
        </div>
        <fieldset className="ui-choices">
          <legend className="ui-legend">When</legend>
          {options.map(([k, label]) => (
            <label key={k} className="ui-choice">
              <input type="radio" name="when" checked={preset === k} onChange={() => setPreset(k)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {preset === "custom" && (
          <div className="ui-field">
            <label htmlFor="fu-custom">Date and time</label>
            <input id="fu-custom" type="datetime-local" className="ui-input" value={custom} onChange={(e) => setCustom(e.target.value)} required />
          </div>
        )}
        <ErrorBanner error={error} />
        <div className="ui-dialog-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Skip
          </button>
          <button className="btn btn-dark btn-sm" disabled={busy}>
            {busy ? <Spinner label="Saving…" /> : "Set follow-up"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
