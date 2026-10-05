"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { IntentLabel, PriorityPill } from "@/components/product";
import { REQUEST_TYPE_LABEL, SENTIMENT_LABEL, type Priority, type RequestType, type Sentiment } from "@/lib/ai/types";
import type { ConversationState, ConversationWithSignal } from "@/lib/types";
import { ArrowRight } from "./icons";
import s from "./signals.module.css";

/* Time ---------------------------------------------------------------- */

function format(iso: string, mode: "relative" | "due" | "full") {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (mode === "full") return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  if (mode === "due") {
    if (sameDay(d, now)) return `Today, ${time}`;
    if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;
    if (sameDay(d, yesterday)) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
  }
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24 && sameDay(d, now)) return time;
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Formats in the owner's own timezone (after hydration), never the server's. */
export function Time({ iso, mode = "relative", className }: { iso: string; mode?: "relative" | "due" | "full"; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(format(iso, mode));
    if (mode !== "relative") return;
    const t = setInterval(() => setText(format(iso, mode)), 60_000);
    return () => clearInterval(t);
  }, [iso, mode]);
  return (
    <time dateTime={iso} className={className} title={text ? new Date(iso).toLocaleString() : undefined}>
      {text ?? " "}
    </time>
  );
}

/* Badges -------------------------------------------------------------- */

export function PriorityBadge({ priority, overridden }: { priority: Priority | null; overridden?: boolean }) {
  if (!priority) return <span className={s.pending}>Not analyzed</span>;
  return (
    <span className={s.priority}>
      <PriorityPill priority={priority} />
      {overridden && <span className={s.override} title="You set this priority">set by you</span>}
    </span>
  );
}

export function IntentBadge({ intent, requestType }: { intent: string; requestType?: RequestType }) {
  return <IntentLabel>{intent || (requestType ? REQUEST_TYPE_LABEL[requestType] : "")}</IntentLabel>;
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span className={s.sentiment} data-sentiment={sentiment}>
      {SENTIMENT_LABEL[sentiment]}
    </span>
  );
}

const STATE_LABEL: Record<ConversationState, string> = {
  new: "New",
  needs_attention: "Needs attention",
  waiting_customer: "Waiting for customer",
  resolved: "Resolved",
};

export function StateBadge({ state, followUpDue }: { state: ConversationState; followUpDue?: boolean }) {
  if (followUpDue && state !== "resolved")
    return (
      <span className={s.state} data-state="due">
        Follow-up due
      </span>
    );
  return (
    <span className={s.state} data-state={state}>
      {STATE_LABEL[state]}
    </span>
  );
}

export function DemoTag() {
  return <span className={s.demo}>Demo</span>;
}

/* Conversation row ---------------------------------------------------- */

export function displayName(c: Pick<ConversationWithSignal, "customer_name" | "customer_email">) {
  return c.customer_name || c.customer_email?.split("@")[0] || "Customer";
}

export function ConversationRow({ c, index = 0 }: { c: ConversationWithSignal; index?: number }) {
  const a = c.analysis && !c.analysis_dismissed ? c.analysis : null;
  const priority = c.priority_override ?? a?.priority ?? null;
  const due = Boolean(c.follow_up && new Date(c.follow_up.due_at).getTime() <= Date.now());
  const name = displayName(c);

  return (
    <li className={`${s.row} ui-enter`} style={{ "--enter-delay": `${Math.min(index, 8) * 40}ms` } as React.CSSProperties}>
      <Link href={`/app/inbox/${c.id}`} className={s.rowLink}>
        <span className={s.avatar} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className={s.rowMain}>
          <div className={s.rowHead}>
            <PriorityBadge priority={priority} overridden={Boolean(c.priority_override)} />
            <strong className={s.name}>{name}</strong>
            {c.customer_email && <span className={s.email}>{c.customer_email}</span>}
            {c.is_demo && <DemoTag />}
            <Time iso={c.last_message_at} className={s.when} />
          </div>
          <p className={s.preview}>
            {c.last_direction === "outbound" && <span className={s.you}>You: </span>}
            {c.last_message_preview || c.subject || "(no text)"}
          </p>
          <div className={s.rowMeta}>
            {a && <IntentBadge intent={a.intent} />}
            {a && <SentimentBadge sentiment={a.sentiment} />}
            <StateBadge state={c.state} followUpDue={due} />
          </div>
          {(c.follow_up || a) && c.state !== "resolved" && (
            <p className={s.next}>
              <ArrowRight size={14} />
              <span>{due && c.follow_up ? c.follow_up.action : c.follow_up?.action ?? a?.next_action}</span>
            </p>
          )}
        </div>
        <span className={s.open} aria-hidden="true">
          Open
        </span>
      </Link>
    </li>
  );
}

export function ConversationList({ items }: { items: ConversationWithSignal[] }) {
  return (
    <ul className={s.list}>
      {items.map((c, i) => (
        <ConversationRow key={c.id} c={c} index={i} />
      ))}
    </ul>
  );
}

/* Metric -------------------------------------------------------------- */

export function MetricCard({
  label,
  value,
  hint,
  href,
  tone = "light",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "light" | "dark";
}) {
  const inner = (
    <>
      <span className={s.metricLabel}>{label}</span>
      <span className={s.metricValue}>{value}</span>
      {hint && <span className={s.metricHint}>{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={s.metric} data-tone={tone}>
      {inner}
    </Link>
  ) : (
    <div className={s.metric} data-tone={tone}>
      {inner}
    </div>
  );
}

/* Empty state --------------------------------------------------------- */

export function EmptyState({ title, children, actions, art = true }: { title: string; children?: ReactNode; actions?: ReactNode; art?: boolean }) {
  return (
    <div className={`${s.empty} ui-enter`}>
      {art && (
        <div className={s.emptyArt} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <h2 className="ui-h2">{title}</h2>
      {children && <div className={s.emptyBody}>{children}</div>}
      {actions && <div className={s.emptyActions}>{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={s.pageHead}>
      <div>
        <h1 className="ui-title">{title}</h1>
        {subtitle && <p className={s.pageSub}>{subtitle}</p>}
      </div>
      {actions && <div className={s.pageActions}>{actions}</div>}
    </header>
  );
}
