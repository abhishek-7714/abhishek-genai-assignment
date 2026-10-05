import Link from "next/link";
import { AnalyticsChart } from "@/components/app/AnalyticsChart";
import { Banner } from "@/components/app/Status";
import { EmptyState, MetricCard, PageHeader } from "@/components/app/signals";
import { LANGUAGE_LABEL, REQUEST_TYPE_LABEL, type RequestType } from "@/lib/ai/types";
import { businessAnalytics, readback } from "@/lib/server/analytics";
import { supabaseServer } from "@/lib/supabase/server";
import s from "./analytics.module.css";

export const metadata = { title: "Analytics — FollowUpOS" };

function duration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return { value: m, unit: "min" };
  const h = ms / 3_600_000;
  if (h < 48) return { value: Math.round(h * 10) / 10, unit: "hrs" };
  return { value: Math.round(h / 24), unit: "days" };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const includeDemo = (await searchParams).demo === "1";
  const supabase = await supabaseServer();
  const [a, rb, demoCount] = await Promise.all([
    businessAnalytics(supabase, includeDemo),
    readback(),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  const hasDemo = (demoCount.count ?? 0) > 0;
  const rt = a.avgResponseMs != null ? duration(a.avgResponseMs) : null;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="How your customer conversations are going — calculated from your own data."
        actions={
          hasDemo ? (
            <Link href={includeDemo ? "/app/analytics" : "/app/analytics?demo=1"} className="btn btn-outline btn-sm">
              {includeDemo ? "Hide demo data" : "Include demo data"}
            </Link>
          ) : undefined
        }
      />

      <div className={s.page}>
        {includeDemo && (
          <Banner tone="demo" title="Including demo data">
            These figures mix in sample conversations. Real figures exclude them.
          </Banner>
        )}

        {a.conversations === 0 ? (
          <EmptyState
            title="Your insights will appear here as conversations come in."
            actions={
              hasDemo ? (
                <Link href="/app/analytics?demo=1" className="btn btn-outline">
                  Preview with demo data
                </Link>
              ) : (
                <Link href="/app/settings#gmail" className="btn btn-dark">
                  Connect Gmail
                </Link>
              )
            }
          >
            Once customer conversations are analyzed, you’ll see what people ask for most, how quickly you reply and how
            your follow-ups are going.
          </EmptyState>
        ) : (
          <>
            <section className={s.metrics} aria-label="Key figures">
              <MetricCard tone="dark" label="Conversations analyzed" value={a.analyzed} hint={`of ${a.conversations} conversations`} />
              <MetricCard label="High-intent conversations" value={a.highIntent} hint="Likely to buy or book" href="/app/inbox?filter=high" />
              <MetricCard label="Follow-ups completed" value={a.followUpsCompleted} />
              <MetricCard label="Follow-ups overdue" value={a.followUpsOverdue} href="/app/follow-ups" />
              <MetricCard
                label="Average response time"
                value={rt ? (
                  <>
                    {rt.value}
                    <span className={s.unit}>{rt.unit}</span>
                  </>
                ) : (
                  "—"
                )}
                hint={rt ? `Across ${a.responseSamples} replies` : "Appears after your first reply"}
              />
            </section>

            <section className={s.charts}>
              {a.requestTypes.length ? (
                <AnalyticsChart
                  title="Most common request types"
                  rows={a.requestTypes.map((r) => ({ key: r.key, label: REQUEST_TYPE_LABEL[r.key as RequestType] ?? r.key, count: r.count }))}
                />
              ) : (
                <div className={s.chartEmpty}>Request types appear once conversations are analyzed.</div>
              )}
              {a.languages.length ? (
                <AnalyticsChart title="Languages customers write in" rows={a.languages.map((r) => ({ key: r.key, label: LANGUAGE_LABEL[r.key] ?? r.key, count: r.count }))} />
              ) : (
                <div className={s.chartEmpty}>Language mix appears once conversations are analyzed.</div>
              )}
            </section>
          </>
        )}

        <section className={s.readback} aria-labelledby="rb-title">
          <div>
            <h2 id="rb-title" className="ui-label">
              Across FollowUpOS
            </h2>
            <p className="ui-hint">Live from every analysis on this FollowUpOS instance — anonymous, no customer details.</p>
          </div>
          {rb && rb.exchanges > 0 ? (
            <div className={s.rbGrid}>
              <p className={`serif ${s.rbBig}`}>
                {rb.shops} shop{rb.shops === 1 ? "" : "s"} served across {rb.languages} language{rb.languages === 1 ? "" : "s"}
              </p>
              <p className={s.rbLine}>
                Most common request type:{" "}
                <strong>{rb.top_request_type ? REQUEST_TYPE_LABEL[rb.top_request_type as RequestType] ?? rb.top_request_type : "—"}</strong>
                {rb.top_request_count ? ` (${rb.top_request_count})` : ""}
              </p>
              {a.avgInputTokens != null && (
                <p className={s.rbLine}>
                  Your average AI usage: {Math.round(a.avgInputTokens)} input / {Math.round(a.avgOutputTokens ?? 0)} output tokens per analysis
                </p>
              )}
            </div>
          ) : (
            <p className="ui-muted">No analyses yet. These figures fill in as FollowUpOS reads conversations.</p>
          )}
        </section>
      </div>
    </>
  );
}
