import { ConversationWorkspace } from "@/components/app/ConversationWorkspace";
import { EmptyState } from "@/components/app/signals";
import Link from "next/link";
import { AppError } from "@/lib/errors";
import { getBusiness } from "@/lib/server/context";
import { getConversation } from "@/lib/server/conversations";
import { env } from "@/lib/server/env";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Conversation — FollowUpOS" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = (await getBusiness())!;
  const supabase = await supabaseServer();

  let data;
  try {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("not_found");
    data = await getConversation(supabase, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found")
      return (
        <EmptyState
          title="This conversation isn’t here."
          actions={
            <Link href="/app/inbox" className="btn btn-dark">
              Back to inbox
            </Link>
          }
        >
          It may have been removed, or it belongs to a different account.
        </EmptyState>
      );
    throw e;
  }

  const gmail = await supabase.from("gmail_connections").select("email").eq("business_id", business.id).maybeSingle();

  return (
    <ConversationWorkspace
      conversation={data.conversation}
      messages={data.messages}
      gmailEmail={gmail.data?.email ?? null}
      aiReady={env.isConfigured.gemini()}
      businessName={business.name}
    />
  );
}
