import "server-only";

type Event =
  | "ai.request_failed"
  | "ai.malformed_output"
  | "ai.safety_flag"
  | "gmail.oauth_failed"
  | "gmail.sync_failed"
  | "gmail.send_failed"
  | "gmail.token_refresh_failed"
  | "auth.failed"
  | "db.error"
  | "api.unhandled";

/**
 * Structured server logs. Callers pass identifiers and error codes only —
 * never message bodies, email addresses or tokens.
 */
export function log(event: Event, fields: Record<string, string | number | boolean | null | undefined> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...fields });
  if (event.endsWith("failed") || event === "api.unhandled" || event === "db.error") console.error(line);
  else console.warn(line);
}

export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 300);
  return String(e).slice(0, 300);
}
