import { FollowUpQueue, type QueueItem } from "@/components/app/FollowUpQueue";
import { EmptyState, PageHeader } from "@/components/app/signals";
import Link from "next/link";
import { dbOk } from "@/lib/server/api";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Follow-ups — FollowUpOS" };

export default async function FollowUpsPage() {
  const supabase = await supabaseServer();
  const sel = "id, action, due_at, status, completed_at, snooze_count, conversation:conversations(id, customer_name, customer_email, last_message_preview, is_demo)";
  const [open, done] = await Promise.all([
    supabase.from("follow_ups").select(sel).eq("status", "open").order("due_at", { ascending: true }).limit(200),
    supabase.from("follow_ups").select(sel).eq("status", "done").order("completed_at", { ascending: false }).limit(5),
  ]);
  const items = dbOk(open) as unknown as QueueItem[];
  const recent = dbOk(done) as unknown as QueueItem[];

  return (
    <>
      <PageHeader title="Follow-ups" subtitle="Your action queue. Nothing here is sent automatically — each one opens the conversation for you to review." />
      {items.length ? (
        <FollowUpQueue items={items} recent={recent} />
      ) : (
        <EmptyState
          title="You’re all caught up."
          actions={
            <Link href="/app/inbox" className="btn btn-outline">
              Go to inbox
            </Link>
          }
        >
          After you reply to a customer, set a follow-up and it will wait here until it’s due.
        </EmptyState>
      )}
    </>
  );
}
