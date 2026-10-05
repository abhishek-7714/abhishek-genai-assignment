"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ApiErrorBody } from "@/lib/errors";
import { RefreshIcon } from "./icons";
import { Time } from "./signals";
import { api, Banner, ErrorBanner, Spinner } from "./Status";

type Err = ApiErrorBody["error"] | null;

export function LoadDemoButton({ variant = "outline" }: { variant?: "outline" | "dark" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err>(null);
  return (
    <>
      <button
        className={`btn btn-${variant}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await api("/api/demo", { method: "POST" });
          setBusy(false);
          if (res.error) return setError(res.error);
          router.refresh();
        }}
      >
        {busy ? <Spinner label="Loading demo…" /> : "Explore a demo workspace"}
      </button>
      {error && <ErrorBanner error={error} />}
    </>
  );
}

export function DemoBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Banner
      tone="demo"
      title="You’re looking at demo data"
      action={
        <button
          className="btn btn-outline btn-xs"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await api("/api/demo", { method: "DELETE" });
            setBusy(false);
            router.refresh();
          }}
        >
          {busy ? <Spinner /> : "Clear demo data"}
        </button>
      }
    >
      Conversations marked <b>Demo</b> are sample customers, not real people. Replies to them are never emailed.
    </Banner>
  );
}

/**
 * Staged analysis: after a sync, conversations are shown immediately and analyzed
 * a few at a time in the background, then the page refreshes with their signals.
 */
export function PendingAnalysis({ count }: { count: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(count);
  const [error, setError] = useState<Err>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!count || running.current) return;
    running.current = true;
    let cancelled = false;
    (async () => {
      let remaining = count;
      while (!cancelled && remaining > 0) {
        const res = await api<{ analyzed: number; remaining: number }>("/api/conversations/analyze-pending", { method: "POST" });
        if (res.error) {
          setError(res.error);
          break;
        }
        remaining = res.data!.remaining;
        setLeft(remaining);
        router.refresh();
        if (!res.data!.analyzed) break;
      }
      running.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [count, router]);

  if (error)
    return (
      <ErrorBanner
        error={error}
        action={
          <button className="btn btn-outline btn-xs" onClick={() => location.reload()}>
            Retry
          </button>
        }
      />
    );
  if (!left) return null;
  return (
    <Banner title="Reading new conversations">
      <Spinner label={`FollowUpOS is analyzing ${left} conversation${left === 1 ? "" : "s"}. They’ll update here as each one finishes.`} />
    </Banner>
  );
}

export function SyncButton({ lastSyncedAt, compact }: { lastSyncedAt: string | null; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Err>(null);
  const [synced, setSynced] = useState(lastSyncedAt);

  async function sync() {
    setBusy(true);
    setError(null);
    const res = await api<{ imported: number; syncedAt: string }>("/api/gmail/sync", { method: "POST" });
    setBusy(false);
    if (res.error) return setError(res.error);
    setSynced(res.data!.syncedAt);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: compact ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="ui-hint" role="status" aria-live="polite">
          {busy ? "Syncing…" : synced ? (
            <>
              Synced <Time iso={synced} />
            </>
          ) : (
            "Not synced yet"
          )}
        </span>
        <button className="btn btn-outline btn-sm" onClick={sync} disabled={busy}>
          {busy ? <Spinner /> : <RefreshIcon size={15} />} Sync inbox
        </button>
      </div>
      <ErrorBanner error={error} />
    </div>
  );
}

export function ConnectGmailButton({ variant = "dark" }: { variant?: "dark" | "outline" }) {
  return (
    <Link href="/api/gmail/connect" className={`btn btn-${variant}`} prefetch={false}>
      Connect Gmail
    </Link>
  );
}
