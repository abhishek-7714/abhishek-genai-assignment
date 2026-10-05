"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ApiErrorBody } from "@/lib/errors";
import { ConnectGmailButton, SyncButton } from "./actions";
import { MailIcon } from "./icons";
import { Time } from "./signals";
import { api, Banner, ErrorBanner, Spinner } from "./Status";

type Connection = { email: string; status: string; last_synced_at: string | null; last_sync_error: string | null } | null;

const STATUS_COPY: Record<string, { tone: "info" | "warn" | "error"; title: string; detail: string }> = {
  connected: { tone: "info", title: "Gmail connected", detail: "Importing your recent customer conversations now." },
  denied: { tone: "warn", title: "Gmail wasn’t connected", detail: "You cancelled on Google’s screen. Connect again whenever you’re ready." },
  scopes: {
    tone: "error",
    title: "Gmail authorization failed",
    detail: "FollowUpOS needs both permissions — reading messages and sending the replies you approve. Connect again and allow both.",
  },
  failed: { tone: "error", title: "Gmail authorization failed", detail: "Google didn’t complete the connection. Please try again." },
  not_configured: { tone: "warn", title: "Gmail isn’t set up on this server", detail: "Add the Google OAuth credentials to enable Gmail." },
};

export function GmailConnection({
  connection,
  status,
  configured,
  scopes,
}: {
  connection: Connection;
  status: string | null;
  configured: boolean;
  scopes: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorBody["error"] | null>(null);
  const [firstSync, setFirstSync] = useState<"idle" | "running" | "done">("idle");
  const started = useRef(false);
  const banner = status ? STATUS_COPY[status] : null;

  // Right after connecting, run the first sync automatically (reading only — nothing is sent).
  useEffect(() => {
    if (status !== "connected" || !connection || started.current) return;
    started.current = true;
    setFirstSync("running");
    api("/api/gmail/sync", { method: "POST" }).then((res) => {
      if (res.error) setError(res.error);
      setFirstSync("done");
      router.replace("/app/settings#gmail");
      router.refresh();
    });
  }, [status, connection, router]);

  async function disconnect() {
    setBusy(true);
    const res = await api("/api/gmail", { method: "DELETE" });
    setBusy(false);
    setConfirming(false);
    if (res.error) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="ui-card ui-card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {banner && firstSync !== "done" && (
        <Banner tone={banner.tone} title={banner.title}>
          {firstSync === "running" ? <Spinner label="Syncing your inbox…" /> : banner.detail}
        </Banner>
      )}
      <ErrorBanner error={error} />

      {connection ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--sage)", color: "var(--deep-green)" }}>
              <MailIcon />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block" }}>{connection.status === "error" ? "Gmail needs reconnecting" : "Gmail connected"}</strong>
              <span className="ui-hint">{connection.email}</span>
            </div>
            <SyncButton lastSyncedAt={connection.last_synced_at} compact />
          </div>
          {connection.status === "error" && (
            <Banner tone="error" title="Gmail access expired or was revoked" action={<ConnectGmailButton variant="outline" />}>
              Your imported conversations are safe. Reconnect to keep syncing and sending.
            </Banner>
          )}
          {connection.last_sync_error && connection.status !== "error" && (
            <Banner tone="warn" title="The last sync didn’t finish">
              Existing conversations weren’t affected. Try syncing again.
            </Banner>
          )}
          <p className="ui-hint">
            Permissions: {scopes.join(", ")}. FollowUpOS imports recent inbox threads from the last 30 days and skips
            promotions, social and automated mail. Replies are only sent when you press Send.
            {connection.last_synced_at && (
              <>
                {" "}
                Last synced <Time iso={connection.last_synced_at} mode="full" />.
              </>
            )}
          </p>
          {confirming ? (
            <Banner
              tone="warn"
              title="Disconnect Gmail?"
              action={
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger btn-xs" onClick={disconnect} disabled={busy}>
                    {busy ? <Spinner /> : "Disconnect"}
                  </button>
                </span>
              }
            >
              FollowUpOS will lose access and delete its stored Gmail credentials. Imported conversations stay in your workspace.
            </Banner>
          ) : (
            <button className="btn btn-danger btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setConfirming(true)}>
              Disconnect Gmail
            </button>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <p className="serif" style={{ fontSize: "1.4rem" }}>
            Your inbox is waiting.
          </p>
          <p className="ui-muted" style={{ fontSize: "0.92rem" }}>
            Connect Gmail to let FollowUpOS surface the conversations that need attention. You’ll be asked to allow reading
            messages and sending replies — FollowUpOS only sends what you approve.
          </p>
          {configured ? <ConnectGmailButton /> : <Banner tone="warn" title="Gmail isn’t set up on this server">Add the Google OAuth credentials to enable Gmail.</Banner>}
        </div>
      )}
    </div>
  );
}
