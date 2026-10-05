/**
 * Every failure the owner can see maps to one of these codes,
 * each with a plain explanation and a recovery action. No stack traces reach the UI.
 */
export type ErrorCode =
  | "unauthorized"
  | "session_expired"
  | "not_found"
  | "invalid_input"
  | "empty_message"
  | "message_too_long"
  | "rate_limited"
  | "ai_unavailable"
  | "ai_not_configured"
  | "ai_malformed"
  | "supabase_unavailable"
  | "gmail_not_configured"
  | "gmail_not_connected"
  | "gmail_auth_failed"
  | "gmail_sync_failed"
  | "gmail_send_failed"
  | "server_misconfigured"
  | "unknown";

export const ERROR_COPY: Record<ErrorCode, { title: string; detail: string; status: number }> = {
  unauthorized: { title: "Please sign in", detail: "You need to be signed in to do that.", status: 401 },
  session_expired: { title: "Your session expired", detail: "Sign in again to pick up where you left off.", status: 401 },
  not_found: { title: "Not found", detail: "That item doesn’t exist or isn’t yours.", status: 404 },
  invalid_input: { title: "Something’s missing", detail: "Check the highlighted fields and try again.", status: 400 },
  empty_message: { title: "Add a customer message", detail: "Paste what the customer wrote so FollowUpOS can read it.", status: 400 },
  message_too_long: { title: "That message is very long", detail: "Trim it to the part the customer actually asked about (under 4,000 characters).", status: 400 },
  rate_limited: { title: "You’ve used all your free analyses", detail: "Create a free account to keep analyzing conversations.", status: 429 },
  ai_unavailable: { title: "FollowUpOS couldn’t read that right now", detail: "The AI service didn’t respond. Your data is safe — try again in a moment.", status: 503 },
  ai_not_configured: { title: "AI isn’t set up yet", detail: "Add GEMINI_API_KEY on the server to enable analysis.", status: 503 },
  ai_malformed: { title: "That analysis didn’t come out right", detail: "The AI returned something we couldn’t trust, so we discarded it. Try again.", status: 502 },
  supabase_unavailable: { title: "We can’t reach your workspace", detail: "The database is unavailable. Nothing was lost — try again shortly.", status: 503 },
  gmail_not_configured: { title: "Gmail isn’t set up on this server", detail: "Add the Google OAuth credentials to enable Gmail.", status: 503 },
  gmail_not_connected: { title: "Gmail isn’t connected", detail: "Connect Gmail in Settings to sync and send.", status: 400 },
  gmail_auth_failed: { title: "Gmail authorization didn’t complete", detail: "Google didn’t grant access. Try connecting again and allow both permissions.", status: 400 },
  gmail_sync_failed: { title: "Sync didn’t finish", detail: "Your existing conversations are untouched. Try syncing again.", status: 502 },
  gmail_send_failed: { title: "Your reply wasn’t sent", detail: "Gmail didn’t accept the message. Your draft is still here — try again.", status: 502 },
  server_misconfigured: { title: "Server setup incomplete", detail: "A required server setting is missing.", status: 500 },
  unknown: { title: "Something went wrong", detail: "Please try again. If it keeps happening, refresh the page.", status: 500 },
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    /** Internal detail for logs only — never shown to users. */
    public internal?: string,
  ) {
    super(code);
  }
}

export type ApiErrorBody = { error: { code: ErrorCode; title: string; detail: string } };

export function toApiError(code: ErrorCode): ApiErrorBody {
  const { title, detail } = ERROR_COPY[code];
  return { error: { code, title, detail } };
}
