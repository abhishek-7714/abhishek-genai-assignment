import { AccountSettings } from "@/components/app/AccountSettings";
import { BusinessForm } from "@/components/app/BusinessForm";
import { GmailConnection } from "@/components/app/GmailConnection";
import { PageHeader } from "@/components/app/signals";
import { getBusiness, getUser } from "@/lib/server/context";
import { env } from "@/lib/server/env";
import { GMAIL_SCOPES } from "@/lib/server/gmail";
import { supabaseServer } from "@/lib/supabase/server";
import s from "./settings.module.css";

export const metadata = { title: "Settings — FollowUpOS" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const { gmail: gmailStatus } = await searchParams;
  const [business, user] = await Promise.all([getBusiness(), getUser()]);
  const supabase = await supabaseServer();
  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("email, status, last_synced_at, last_sync_error")
    .eq("business_id", business!.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Settings" />
      <div className={s.sections}>
        <section className={s.section} aria-labelledby="set-business">
          <div className={s.aside}>
            <h2 id="set-business" className="ui-h2">
              Business
            </h2>
            <p className="ui-hint">What FollowUpOS knows about you. Drafts only quote facts written here.</p>
          </div>
          <div className="ui-card ui-card-pad">
            <BusinessForm
              mode="update"
              initial={{ name: business!.name, businessType: business!.business_type, language: business!.language, facts: business!.facts }}
            />
          </div>
        </section>

        <section className={s.section} aria-labelledby="gmail" id="gmail">
          <div className={s.aside}>
            <h2 className="ui-h2">Gmail</h2>
            <p className="ui-hint">Read customer threads and send the replies you approve.</p>
          </div>
          <GmailConnection
            connection={connection}
            status={gmailStatus ?? null}
            configured={env.isConfigured.gmail()}
            scopes={GMAIL_SCOPES.map((sc) => sc.split("/").pop()!)}
          />
        </section>

        <section className={s.section} aria-labelledby="set-ai">
          <div className={s.aside}>
            <h2 id="set-ai" className="ui-h2">
              AI
            </h2>
            <p className="ui-hint">How FollowUpOS reads conversations.</p>
          </div>
          <div className={`ui-card ui-card-pad ${s.ai}`}>
            <dl>
              <div>
                <dt>What it does</dt>
                <dd>Reads each conversation and suggests intent, priority, sentiment, the likely blocker, one next action and a draft reply.</dd>
              </div>
              <div>
                <dt>What it uses</dt>
                <dd>The recent messages in that conversation and your business facts. Nothing else about you or your customers.</dd>
              </div>
              <div>
                <dt>What it won’t do</dt>
                <dd>
                  Invent prices, availability or policies; promise refunds or discounts you haven’t listed; or send anything. Every
                  draft is checked after it’s written — if it mentions a price or promise that isn’t in your facts, it’s flagged for review.
                </dd>
              </div>
              <div>
                <dt>You stay in control</dt>
                <dd>Replies are drafts. You can edit, regenerate, change the priority, dismiss an analysis or ignore it entirely.</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{env.isConfigured.gemini() ? `Google ${env.geminiModel()}` : "Not configured on this server"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={s.section} aria-labelledby="set-account">
          <div className={s.aside}>
            <h2 id="set-account" className="ui-h2">
              Account
            </h2>
            <p className="ui-hint">{user?.email}</p>
          </div>
          <AccountSettings fullName={(user?.user_metadata?.full_name as string) ?? ""} email={user?.email ?? ""} />
        </section>
      </div>
    </>
  );
}
