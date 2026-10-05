import Link from "next/link";
import { ConnectGmailButton, DemoBanner, LoadDemoButton, PendingAnalysis, SyncButton } from "@/components/app/actions";
import { ConversationList, EmptyState, MetricCard, PageHeader, Time } from "@/components/app/signals";
import { getBusiness } from "@/lib/server/context";
import { effectivePriority, isFollowUpDue, listConversations, sortByAttention } from "@/lib/server/conversations";
import { supabaseServer } from "@/lib/supabase/server";
import s from "./home.module.css";

export const metadata = { title: "Today — FollowUpOS" };

export default async function HomePage() {
  const business = (await getBusiness())!;
  const supabase = await supabaseServer();
  const [open, gmail] = await Promise.all([
    listConversations(supabase),
    supabase.from("gmail_connections").select("email, last_synced_at").eq("business_id", business.id).maybeSingle(),
  ]);
  const connection = gmail.data;

  const { count: totalCount } = await supabase.from("conversations").select("id", { count: "exact", head: true });
  const hasDemo = open.some((c) => c.is_demo);
  const pending = open.filter((c) => c.needs_analysis && !c.is_demo).length;

  const attention = open.filter((c) => c.state === "needs_attention" || c.state === "new");
  const highIntent = open.filter((c) => effectivePriority(c) === "high");
  const overdue = open.filter((c) => isFollowUpDue(c));
  const waiting = open.filter((c) => c.state === "waiting_customer");
  const queue = sortByAttention(attention).slice(0, 6);
  const dueSoon = open
    .filter((c) => c.follow_up)
    .sort((a, b) => new Date(a.follow_up!.due_at).getTime() - new Date(b.follow_up!.due_at).getTime())
    .slice(0, 4);

  if (!totalCount && !connection) {
    return (
      <>
        <PageHeader title={`Welcome to ${business.name}’s FollowUpOS.`} subtitle="Let’s find the conversations that need you." />
        <EmptyState
          title="Your inbox is waiting."
          actions={
            <>
              <ConnectGmailButton />
              <LoadDemoButton />
            </>
          }
        >
          Connect Gmail to let FollowUpOS surface the conversations that need attention. Or explore a demo workspace
          first — you can also <Link href="/app/analyze" style={{ textDecoration: "underline" }}>analyze a single message</Link> right now.
        </EmptyState>
      </>
    );
  }

  return (
    <div className={s.page}>
      <PageHeader
        title="What needs you today."
        subtitle={
          attention.length
            ? `${attention.length} conversation${attention.length === 1 ? "" : "s"} waiting on you.`
            : "Nothing is waiting on you right now."
        }
        actions={connection ? <SyncButton lastSyncedAt={connection.last_synced_at} compact /> : <ConnectGmailButton variant="outline" />}
      />

      {hasDemo && <DemoBanner />}
      {pending > 0 && <PendingAnalysis count={pending} />}

      <section className={s.metrics} aria-label="Today at a glance">
        <MetricCard tone="dark" label="Needs attention" value={attention.length} hint="Your turn to reply" href="/app/inbox?filter=attention" />
        <MetricCard label="High intent" value={highIntent.length} hint="Likely to buy or book" href="/app/inbox?filter=high" />
        <MetricCard label="Follow-ups overdue" value={overdue.length} hint="Past their due time" href="/app/follow-ups" />
        <MetricCard label="Waiting for customer" value={waiting.length} hint="You’ve replied" href="/app/inbox?filter=waiting" />
      </section>

      <div className={s.columns}>
        <section aria-labelledby="queue-title">
          <div className={s.sectionHead}>
            <h2 id="queue-title" className="ui-h2">
              Needs attention
            </h2>
            <Link href="/app/inbox" className="btn btn-ghost btn-xs">
              Open inbox
            </Link>
          </div>
          {queue.length ? (
            <ConversationList items={queue} />
          ) : (
            <EmptyState title="Nothing needs your attention yet." art={false}>
              New customer messages will appear here, ranked by what matters most.
            </EmptyState>
          )}
        </section>

        <aside aria-labelledby="due-title" className={s.side}>
          <div className={s.sectionHead}>
            <h2 id="due-title" className="ui-h2">
              Follow-ups
            </h2>
            <Link href="/app/follow-ups" className="btn btn-ghost btn-xs">
              All
            </Link>
          </div>
          {dueSoon.length ? (
            <ul className={s.dueList}>
              {dueSoon.map((c) => {
                const late = new Date(c.follow_up!.due_at).getTime() <= Date.now();
                return (
                  <li key={c.id}>
                    <Link href={`/app/inbox/${c.id}`} className={s.due} data-late={late}>
                      <span className={s.dueWho}>{c.customer_name ?? c.customer_email}</span>
                      <span className={s.dueAction}>{c.follow_up!.action}</span>
                      <span className={s.dueWhen}>
                        {late ? "Overdue · " : "Due "}
                        <Time iso={c.follow_up!.due_at} mode="due" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ui-muted" style={{ fontSize: "0.92rem" }}>
              You’re all caught up. Set a follow-up after replying and it will show here.
            </p>
          )}
          <div className={s.principle}>
            <p className="serif">Nothing is sent without you.</p>
            <span>FollowUpOS drafts and recommends. You review, edit and approve every reply.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
