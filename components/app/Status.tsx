"use client";

import { ReactNode } from "react";
import type { ApiErrorBody } from "@/lib/errors";

/** Screen-reader-announced banner for errors and confirmations. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "warn" | "error" | "demo";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ui-banner" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <div style={{ flex: 1 }}>
        {title && <strong>{title}</strong>}
        {children}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ error, action }: { error: ApiErrorBody["error"] | null; action?: ReactNode }) {
  if (!error) return null;
  return (
    <Banner tone={error.code === "rate_limited" ? "warn" : "error"} title={error.title} action={action}>
      {error.detail}
    </Banner>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="ui-spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

/** POST/PATCH/DELETE helper that always resolves to data or a friendly error. */
export async function api<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<{ data?: T; error?: ApiErrorBody["error"] }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      if (body?.error) return { error: body.error };
      return { error: { code: "unknown", title: "Something went wrong", detail: "Please try again." } };
    }
    return { data: body as T };
  } catch {
    return { error: { code: "unknown", title: "You seem to be offline", detail: "Check your connection and try again." } };
  }
}
