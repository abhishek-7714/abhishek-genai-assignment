"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { REQUEST_TYPE_LABEL, URGENCY_LABEL, type Priority } from "@/lib/ai/types";
import type { ApiErrorBody } from "@/lib/errors";
import type { ConversationWithSignal, Message } from "@/lib/types";
import { FollowUpDialog } from "./FollowUpDialog";
import { ArrowLeft, CheckIcon, RefreshIcon } from "./icons";
import { DemoTag, displayName, IntentBadge, SentimentBadge, StateBadge, Time } from "./signals";
import { api, Banner, ErrorBanner, Spinner } from "./Status";
import s from "./ConversationWorkspace.module.css";

type Err = ApiErrorBody["error"] | null;

type Props = {
  conversation: ConversationWithSignal;
  messages: Message[];
  gmailEmail: string | null;
  aiReady: boolean;
  businessName: string;
};

export function ConversationWorkspace({ conversation: c, messages, gmailEmail, aiReady, businessName }: Props) {
  const router = useRouter();
  const a = c.analysis && !c.analysis_dismissed ? c.analysis : null;
  const priority = c.priority_override ?? a?.priority ?? null;
  const due = Boolean(c.follow_up && new Date(c.follow_up.due_at).getTime() <= Date.now());
  const name = displayName(c);

  const [draft, setDraft] = useState(a?.suggested_reply ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "analyze" | "send" | "state" | "priority" | "dismiss">(null);
  const [error, setError] = useState<Err>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  // A fresh analysis replaces the draft.
  useEffect(() => {
    setDraft(a?.suggested_reply ?? "");
  }, [a?.id, a?.suggested_reply]);
  // Braces matter: scrollIntoView returns a Promise in recent browsers, and an effect must not return one.
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const canSend = c.is_demo || Boolean(gmailEmail);

  async function analyze(style?: string) {
    setBusy("analyze");
    setError(null);
    const res = await api(`/api/conversations/${c.id}/analyze`, { method: "POST", json: { style } });
    setBusy(null);
    if (res.error) return setError(res.error);
    setEditing(false);
    router.refresh();
  }

  async function patch(json: Record<string, unknown>, kind: NonNullable<typeof busy>, message?: string) {
    setBusy(kind);
    setError(null);
    const res = await api(`/api/conversations/${c.id}`, { method: "PATCH", json });
    setBusy(null);
    if (res.error) return setError(res.error);
    if (message) setNotice(message);
    router.refresh();
  }

  return (
    <div className={s.wrap}>
      <Link href="/app/inbox" className={s.back}>
        <ArrowLeft size={16} /> Back to inbox
      </Link>

      <header className={s.head}>
        <span className={s.avatar} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className={s.who}>
          <h1 className="ui-h2">{name}</h1>
          <p className="ui-muted">
            {c.customer_email ?? "No email address"}
            {c.subject && <> · {c.subject}</>}
          </p>
        </div>
        <div className={s.headMeta}>
          {c.is_demo && <DemoTag />}
          <StateBadge state={c.state} followUpDue={due} />
        </div>
      </header>

      <div aria-live="polite">
        {notice && (
          <Banner title={notice} action={<button className="btn btn-ghost btn-xs" onClick={() => setNotice(null)}>Dismiss</button>} />
        )}
        <ErrorBanner error={error} />
      </div>

      <div className={s.grid}>
        {/* What the customer actually said */}
        <section className={s.thread} aria-labelledby="thread-title">
          <h2 id="thread-title" className="ui-label">
            Conversation
          </h2>
          <ol className={s.messages}>
            {messages.map((m) => (
              <li key={m.id} className={s.msg} data-dir={m.direction}>
                <div className={s.msgMeta}>
                  <span>{m.direction === "inbound" ? m.from_name || name : `You · ${businessName}`}</span>
                  <Time iso={m.sent_at} mode="full" />
                </div>
                <div className={s.bubble}>{m.body || <em className="ui-muted">(no text content)</em>}</div>
                {m.is_demo && m.direction === "outbound" && <span className={s.demoNote}>Demo — not emailed</span>}
              </li>
            ))}
          </ol>
          <div ref={threadEnd} />
        </section>

        {/* What FollowUpOS recommends */}
        <aside className={s.panel} aria-labelledby="signal-title">
          <div className={`ui-card-dark ${s.signal}`}>
            <div className={s.signalHead}>
              <h2 id="signal-title" className={s.signalTitle}>
                <LogoMark size={16} /> FollowUpOS signal
              </h2>
              {a && <span className={s.recommends}>Recommendation · <Time iso={a.created_at} /></span>}
            </div>

            {!a ? (
              <div className={s.noSignal}>
                {c.analysis_dismissed ? (
                  <p>You dismissed this analysis.</p>
                ) : (
                  <p>{aiReady ? "This conversation hasn’t been analyzed yet." : "AI analysis isn’t configured on this server."}</p>
                )}
                {aiReady && (
                  <button className="btn btn-light btn-sm" onClick={() => analyze()} disabled={busy !== null}>
                    {busy === "analyze" ? <Spinner label="Reading conversation…" /> : "Analyze conversation"}
                  </button>
                )}
              </div>
            ) : (
              <>
                <dl className={s.fields}>
                  <div>
                    <dt>Intent</dt>
                    <dd>
                      <IntentBadge intent={a.intent} />
                    </dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>
                      <label className="sr-only" htmlFor="priority">
                        Priority
                      </label>
                      <select
                        id="priority"
                        className={s.prioritySelect}
                        value={priority ?? "medium"}
                        disabled={busy !== null}
                        onChange={(e) => {
                          const v = e.target.value as Priority;
                          patch({ priorityOverride: v === a.priority ? null : v }, "priority", "Priority updated");
                        }}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      {c.priority_override && <span className={s.override}>set by you · AI said {a.priority}</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>Sentiment</dt>
                    <dd className={s.light}>
                      <SentimentBadge sentiment={a.sentiment} />
                    </dd>
                  </div>
                  <div>
                    <dt>Urgency</dt>
                    <dd>{URGENCY_LABEL[a.urgency]}</dd>
                  </div>
                  <div>
                    <dt>Request type</dt>
                    <dd>{REQUEST_TYPE_LABEL[a.request_type]}</dd>
                  </div>
                  <div>
                    <dt>Likely blocker</dt>
                    <dd>{a.blocker}</dd>
                  </div>
                </dl>

                <div className={s.next}>
                  <span className="ui-label">Next action</span>
                  <p>{a.next_action}</p>
                </div>
              </>
            )}
          </div>

          {a && c.state !== "resolved" && (
            <div className={`ui-card ${s.reply}`}>
              <div className={s.replyHead}>
                <span className={s.replyLabel}>
                  <LogoMark size={14} /> Suggested reply
                  <span className={s.draftTag}>Draft</span>
                </span>
                <details className={s.redraft}>
                  <summary aria-label="Redraft options">
                    {busy === "analyze" ? <Spinner /> : <RefreshIcon size={15} />} Improve
                  </summary>
                  <div className={s.redraftMenu}>
                    {[
                      ["regenerate", "Regenerate"],
                      ["shorter", "Make it shorter"],
                      ["warmer", "Make it warmer"],
                      ["formal", "More formal"],
                    ].map(([k, label]) => (
                      <button
                        key={k}
                        disabled={busy !== null || !aiReady}
                        onClick={(e) => {
                          (e.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                          analyze(k);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </details>
              </div>

              {a.needs_review && (
                <Banner tone="warn" title="Check this draft carefully">
                  {a.review_reason}
                </Banner>
              )}

              {editing ? (
                <>
                  <label htmlFor="draft" className="sr-only">
                    Reply
                  </label>
                  <textarea id="draft" className="ui-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                </>
              ) : (
                <p className={s.replyText}>“{draft}”</p>
              )}

              <div className={s.replyActions}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Done editing" : "Edit response"}
                </button>
                <button
                  className="btn btn-dark btn-sm"
                  disabled={!draft.trim() || !canSend || busy !== null}
                  onClick={() => setReviewOpen(true)}
                >
                  Send reply
                </button>
              </div>
              {!canSend && (
                <p className="ui-hint">
                  <Link href="/app/settings#gmail" style={{ textDecoration: "underline" }}>
                    Connect Gmail
                  </Link>{" "}
                  to send replies. You can still copy this draft.
                </p>
              )}
            </div>
          )}

          <div className={`ui-card ${s.controls}`}>
            <span className="ui-label">Follow-up</span>
            {c.follow_up ? (
              <div className={s.follow} data-late={due}>
                <p>{c.follow_up.action}</p>
                <span>
                  {due ? "Overdue · " : "Due "}
                  <Time iso={c.follow_up.due_at} mode="due" />
                </span>
                <div className={s.row}>
                  <FollowUpActions id={c.follow_up.id} onError={setError} />
                </div>
              </div>
            ) : (
              <p className="ui-muted" style={{ fontSize: "0.88rem" }}>
                No follow-up set.
              </p>
            )}
            <div className={s.row}>
              {c.state !== "resolved" && (
                <button className="btn btn-outline btn-xs" onClick={() => setFollowOpen(true)}>
                  {c.follow_up ? "Change follow-up" : "Set follow-up"}
                </button>
              )}
              {c.state !== "resolved" ? (
                <button className="btn btn-outline btn-xs" disabled={busy !== null} onClick={() => patch({ state: "resolved" }, "state", "Marked as resolved")}>
                  <CheckIcon size={14} /> Mark resolved
                </button>
              ) : (
                <button className="btn btn-outline btn-xs" disabled={busy !== null} onClick={() => patch({ state: "needs_attention" }, "state", "Reopened")}>
                  Reopen
                </button>
              )}
              {a && (
                <button className="btn btn-ghost btn-xs" disabled={busy !== null} onClick={() => patch({ analysisDismissed: true }, "dismiss", "Analysis dismissed")}>
                  Dismiss analysis
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        conversation={c}
        draft={draft}
        setDraft={setDraft}
        gmailEmail={gmailEmail}
        onSent={(demo) => {
          setReviewOpen(false);
          setEditing(false);
          setNotice(demo ? "Recorded as sent (demo — nothing was emailed)" : "Reply sent from Gmail");
          router.refresh();
          setFollowOpen(true);
        }}
      />

      <FollowUpDialog
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        conversationId={c.id}
        defaultAction={a?.next_action && a.next_action !== "No action needed" ? a.next_action : `Check in with ${name}`}
        onSaved={() => {
          setFollowOpen(false);
          setNotice("Follow-up set");
          router.refresh();
        }}
      />
    </div>
  );
}

function FollowUpActions({ id, onError }: { id: string; onError: (e: Err) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (op: string, until?: string) => {
    setBusy(op);
    const res = await api(`/api/follow-ups/${id}`, { method: "PATCH", json: { op, until } });
    setBusy(null);
    if (res.error) return onError(res.error);
    router.refresh();
  };
  return (
    <>
      <button className="btn btn-dark btn-xs" disabled={busy !== null} onClick={() => act("complete")}>
        {busy === "complete" ? <Spinner /> : "Complete"}
      </button>
      <button className="btn btn-outline btn-xs" disabled={busy !== null} onClick={() => act("snooze")}>
        Snooze 1 day
      </button>
      <button className="btn btn-ghost btn-xs" disabled={busy !== null} onClick={() => act("cancel")}>
        Cancel
      </button>
    </>
  );
}

/** Explicit owner confirmation before anything reaches Gmail. */
function ReviewDialog({
  open,
  onClose,
  conversation: c,
  draft,
  setDraft,
  gmailEmail,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  conversation: ConversationWithSignal;
  draft: string;
  setDraft: (v: string) => void;
  gmailEmail: string | null;
  onSent: (demo: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Err>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setError(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function send() {
    setSending(true);
    setError(null);
    const res = await api<{ demo: boolean }>(`/api/conversations/${c.id}/send`, { method: "POST", json: { body: draft } });
    setSending(false);
    if (res.error) return setError(res.error);
    onSent(res.data!.demo);
  }

  const subject = c.subject ? (c.subject.toLowerCase().startsWith("re:") ? c.subject : `Re: ${c.subject}`) : "Re: your message";

  return (
    <dialog ref={ref} className="ui-dialog" onClose={onClose} aria-labelledby="review-title">
      <div className="ui-dialog-body">
        <h2 id="review-title" className="ui-h2">
          Review before sending
        </h2>
        <dl className={s.envelope}>
          <div>
            <dt>From</dt>
            <dd>{c.is_demo ? "Demo workspace" : gmailEmail}</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>{c.customer_email}</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>{subject}</dd>
          </div>
        </dl>
        <label htmlFor="final" className="ui-label">
          Message
        </label>
        <textarea id="final" className="ui-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} />
        {c.is_demo && (
          <Banner tone="demo">This is a demo conversation. Sending records the reply here — no email is sent.</Banner>
        )}
        <ErrorBanner error={error} />
        <div className="ui-dialog-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button className="btn btn-dark btn-sm" onClick={send} disabled={sending || !draft.trim()}>
            {sending ? <Spinner label="Sending…" /> : c.is_demo ? "Send (demo)" : "Send from Gmail"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
