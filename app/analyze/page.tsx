import Link from "next/link";
import { Analyzer } from "@/components/app/Analyzer";
import { Wordmark } from "@/components/Logo";
import { REQUEST_TYPE_LABEL, type RequestType } from "@/lib/ai/types";
import { readback } from "@/lib/server/analytics";
import { getUser } from "@/lib/server/context";
import s from "./analyze.module.css";
import "../ui.css";

export const metadata = {
  title: "Analyze a customer message — FollowUpOS",
  description: "Paste a customer message and see its intent, priority, sentiment, likely blocker, one next action and a draft reply.",
};
export const dynamic = "force-dynamic";

export default async function PublicAnalyzePage() {
  const [user, rb] = await Promise.all([getUser().catch(() => null), readback().catch(() => null)]);
  return (
    <div className={`ui-surface ${s.page}`}>
      <header className={s.band}>
        <nav className={s.nav} aria-label="Primary">
          <Link href="/" className={s.brand}>
            <Wordmark />
          </Link>
          <div className={s.navRight}>
            {user ? (
              <Link href="/app" className="btn btn-light btn-sm">
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className={s.signin}>
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-light btn-sm">
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className={s.intro}>
          <h1 className={s.title}>Every customer conversation has a next step.</h1>
          <p className={s.sub}>Paste a message. See what the customer wants, how urgent it is, what’s in the way — and exactly what to do next.</p>
          {rb && rb.exchanges > 0 && (
            <p className={s.readback}>
              {rb.shops} shop{rb.shops === 1 ? "" : "s"} served across {rb.languages} language{rb.languages === 1 ? "" : "s"}
              {rb.top_request_type && (
                <>
                  {" "}· Most common request: {REQUEST_TYPE_LABEL[rb.top_request_type as RequestType] ?? rb.top_request_type}
                </>
              )}
            </p>
          )}
        </div>
      </header>
      <main className={`container ${s.main}`}>
        <Analyzer scope={user ? "account" : "visitor"} />
      </main>
    </div>
  );
}
