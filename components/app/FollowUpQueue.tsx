"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiErrorBody } from "@/lib/errors";
import { DemoTag, Time } from "./signals";
import { api, ErrorBanner, Spinner } from "./Status";
import s from "./FollowUpQueue.module.css";

export type QueueItem = {
  id: string;
  action: string;
  due_at: string;
  status: string;
  completed_at: string | null;
  snooze_count: number;
  conversation: { id: string; customer_name: string | null; customer_email: string | null; last_message_preview: string | null; is_demo: boolean } | null;
};

function group(items: QueueItem[]) {
  const now = Date.now();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    overdue: items.filter((i) => new Date(i.due_at).getTime() <= now),
    today: items.filter((i) => {
      const t = new Date(i.due_at).getTime();
      return t > now && t <= end.getTime();
    }),
    upcoming: items.filter((i) => new Date(i.due_at).getTime() > end.getTime()),
  };
}

export function FollowUpQueue({ items, recent }: { items: QueueItem[]; recent: QueueItem[] }) {
  // Group after mount so "today" uses the owner's local day.
  const [groups, setGroups] = useState<ReturnType<typeof group> | null>(null);
  useEffect(() => {
    setGroups(group(items));
    const t = setInterval(() => setGroups(group(items)), 60_000);
    return () => clearInterval(t);
  }, [items]);

  if (!groups) return <div className="ui-skeleton" style={{ height: 240 }} aria-label="Loading follow-ups" />;

  const sections: [keyof typeof groups, string, string][] = [
    ["overdue", "Overdue", "Past their due time — these customers are waiting the longest."],
    ["today", "Due today", "Later today."],
    ["upcoming", "Upcoming", "Scheduled for later."],
  ];

  return (
    <div className={s.wrap}>
      {sections.map(([key, title, hint]) =>
        groups[key].length ? (
          <section key={key} aria-labelledby={`fu-${key}`}>
            <div className={s.head}>
              <h2 id={`fu-${key}`} className="ui-h2">
                {title} <span className={s.count}>{groups[key].length}</span>
              </h2>
              <p className="ui-hint">{hint}</p>
            </div>
            <ul className={s.list}>
              {groups[key].map((item, i) => (
                <FollowUpCard key={item.id} item={item} late={key === "overdue"} index={i} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {!groups.overdue.length && !groups.today.length && (
        <p className={s.calm}>Nothing due today. Upcoming follow-ups are below.</p>
      )}
      {recent.length > 0 && (
        <section aria-labelledby="fu-done" className={s.done}>
          <h2 id="fu-done" className="ui-label">
            Recently completed
          </h2>
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <span>✓</span> {r.conversation?.customer_name ?? r.conversation?.customer_email} — {r.action}
                {r.completed_at && (
                  <>
                    {" "}
                    · <Time iso={r.completed_at} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function FollowUpCard({ item, late, index = 0 }: { item: QueueItem; late: boolean; index?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiErrorBody["error"] | null>(null);
  const c = item.conversation;

  const act = async (op: string, until?: string) => {
    setBusy(op);
    setError(null);
    const res = await api(`/api/follow-ups/${item.id}`, { method: "PATCH", json: { op, until } });
    setBusy(null);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

  return (
    <li className={`${s.card} ui-enter`} data-late={late} style={{ "--enter-delay": `${index * 40}ms` } as React.CSSProperties}>
      <div className={s.main}>
        <div className={s.who}>
          <strong>{c?.customer_name ?? c?.customer_email ?? "Customer"}</strong>
          {c?.is_demo && <DemoTag />}
        </div>
        <p className={s.action}>{item.action}</p>
        <p className={s.due}>
          Due: <Time iso={item.due_at} mode="due" />
          {item.snooze_count > 0 && <span> · snoozed {item.snooze_count}×</span>}
        </p>
        {c?.last_message_preview && <p className={s.quote}>“{c.last_message_preview}”</p>}
        <ErrorBanner error={error} />
      </div>
      <div className={s.actions}>
        {c && (
          <Link href={`/app/inbox/${c.id}`} className="btn btn-dark btn-xs">
            Open conversation
          </Link>
        )}
        <button className="btn btn-outline btn-xs" disabled={busy !== null} onClick={() => act("complete")}>
          {busy === "complete" ? <Spinner /> : "Complete"}
        </button>
        <details className={s.snooze}>
          <summary className="btn btn-ghost btn-xs">{busy === "snooze" ? <Spinner /> : "Snooze"}</summary>
          <div className={s.snoozeMenu}>
            <button onClick={() => act("snooze", inHours(3))}>3 hours</button>
            <button onClick={() => act("snooze")}>1 day</button>
            <button onClick={() => act("snooze", inHours(72))}>3 days</button>
          </div>
        </details>
      </div>
    </li>
  );
}
