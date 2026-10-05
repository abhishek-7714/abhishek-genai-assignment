"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Catches unexpected failures inside the workspace — no stack traces reach the owner. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("workspace error", error.digest ?? "");
  }, [error]);
  return (
    <div className="ui-card ui-card-pad ui-enter" style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 className="ui-h2">This page didn’t load.</h1>
      <p className="ui-muted">
        Something went wrong on our side. Your conversations and drafts are safe — try again, or head back to your inbox.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-dark btn-sm" onClick={reset}>
          Try again
        </button>
        <Link href="/app" className="btn btn-outline btn-sm">
          Back to Today
        </Link>
      </div>
    </div>
  );
}
