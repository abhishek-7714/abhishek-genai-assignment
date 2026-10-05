import Link from "next/link";
import { ConnectGmailButton, DemoBanner, LoadDemoButton, PendingAnalysis, SyncButton } from "@/components/app/actions";
import { InboxControls } from "@/components/app/InboxControls";
import { ConversationList, EmptyState, PageHeader } from "@/components/app/signals";
import { REQUEST_TYPES, SENTIMENTS } from "@/lib/ai/types";
import { getBusiness } from "@/lib/server/context";
import { effectivePriority, isFollowUpDue, listConversations, sortByAttention } from "@/lib/server/conversations";
import { supabaseServer } from "@/lib/supabase/server";
import type { ConversationWithSignal } from "@/lib/types";

export const metadata = { title: "Inbox — FollowUpOS" };

const FILTERS = {
  all: { label: "All", test: (c: ConversationWithSignal) => c.state !== "resolved" },
  attention: { label: "Needs attention", test: (c: ConversationWithSignal) => c.state === "needs_attention" || c.state === "new" },
  high: { label: "High intent", test: (c: ConversationWithSignal) => c.state !== "resolved" && effectivePriority(c) === "high" },
  due: { label: "Follow-up due", test: (c: ConversationWithSignal) => c.state !== "resolved" && isFollowUpDue(c) },
  waiting: { label: "Waiting", test: (c: ConversationWithSignal) => c.state === "waiting_customer" },
  resolved: { label: "Resolved", test: (c: ConversationWithSignal) => c.state === "resolved" },
} as const;

type FilterKey = keyof typeof FILTERS;

/** Strip characters that have meaning in PostgREST filter syntax. */
const clean = (q: string) => q.replace(/[,()*%\\:"]/g, " ").trim().slice(0, 80);

async function searchIds(q: string) {
  const supabase = await supabaseServer();
  const term = `*${q}*`;
  const [convs, msgs] = await Promise.all([
    supabase
      .from("conversations")
      .select("id")
      .or(`customer_name.ilike.${term},customer_email.ilike.${term},subject.ilike.${term},last_message_preview.ilike.${term}`)
      .limit(300),
    supabase.from("messages").select("conversation_id").ilike("body", `%${q}%`).limit(300),
  ]);
  return new Set([...(convs.data ?? []).map((r) => r.id as string), ...(msgs.data ?? []).map((r) => r.conversation_id as string)]);
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filter = (params.filter && params.filter in FILTERS ? params.filter : "all") as FilterKey;
  const sort = params.sort === "newest" || params.sort === "due" ? params.sort : "priority";
  const q = clean(params.q ?? "");
  const type = REQUEST_TYPES.includes(params.type as never) ? params.type : undefined;
  const sentiment = SENTIMENTS.includes(params.sentiment as never) ? params.sentiment : undefined;
  const lang = params.lang || undefined;

  const business = (await getBusiness())!;
  const supabase = await supabaseServer();
  const [all, gmail] = await Promise.all([
    listConversations(supabase, { includeResolved: true }),
    supabase.from("gmail_connections").select("email, last_synced_at").eq("business_id", business.id).maybeSingle(),
  ]);

  let scoped = all;
  if (q) {
    const ids = await searchIds(q);
    scoped = scoped.filter((c) => ids.has(c.id));
  }
  if (type) scoped = scoped.filter((c) => c.analysis?.request_type === type);
  if (sentiment) scoped = scoped.filter((c) => c.analysis?.sentiment === sentiment);
  if (lang) scoped = scoped.filter((c) => c.analysis?.reply_language === lang);

  const counts = Object.fromEntries(Object.entries(FILTERS).map(([k, f]) => [k, scoped.filter(f.test).length])) as Record<FilterKey, number>;
  let items = scoped.filter(FILTERS[filter].test);
  if (sort === "priority") items = sortByAttention(items);
  if (sort === "due")
    items = [...items].sort((a, b) => {
      const da = a.follow_up ? new Date(a.follow_up.due_at).getTime() : Infinity;
      const db = b.follow_up ? new Date(b.follow_up.due_at).getTime() : Infinity;
      return da - db;
    });

  const languages = [...new Set(all.map((c) => c.analysis?.reply_language).filter(Boolean))] as string[];
  const pending = all.filter((c) => c.needs_analysis && !c.is_demo).length;

  if (!all.length) {
    return (
      <>
        <PageHeader title="Inbox" />
        {gmail.data ? (
          <EmptyState title="No customer conversations found yet." actions={<SyncButton lastSyncedAt={gmail.data.last_synced_at} />}>
            FollowUpOS imports recent customer threads from your Gmail inbox — promotions, social and update emails are skipped.
            Sync again once new enquiries arrive.
          </EmptyState>
        ) : (
          <EmptyState
            title="Your inbox is waiting."
            actions={
              <>
                <ConnectGmailButton />
                <LoadDemoButton />
              </>
            }
          >
            Connect Gmail to let FollowUpOS surface the conversations that need attention.
          </EmptyState>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={q ? <>Results for “{q}” · <Link href="/app/inbox" style={{ textDecoration: "underline" }}>clear search</Link></> : "Every conversation, ranked by what it needs from you."}
        actions={gmail.data ? <SyncButton lastSyncedAt={gmail.data.last_synced_at} compact /> : <ConnectGmailButton variant="outline" />}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {all.some((c) => c.is_demo) && <DemoBanner />}
        {pending > 0 && <PendingAnalysis count={pending} />}
        <InboxControls
          filters={Object.entries(FILTERS).map(([key, f]) => ({ key, label: f.label, count: counts[key as FilterKey] }))}
          active={filter}
          sort={sort}
          type={type}
          sentiment={sentiment}
          lang={lang}
          languages={languages}
        />
        {items.length ? (
          <ConversationList items={items} />
        ) : filter === "due" || filter === "attention" ? (
          <EmptyState title="You’re all caught up." art={false}>
            Nothing in “{FILTERS[filter].label}” right now.
          </EmptyState>
        ) : (
          <EmptyState title="No conversations match." art={false}>
            Try a different filter{q ? " or search" : ""}.
          </EmptyState>
        )}
      </div>
    </>
  );
}
