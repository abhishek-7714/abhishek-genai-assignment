import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { ERROR_COPY, ErrorCode } from "@/lib/errors";

/** Full-page error for when the workspace itself can't load (e.g. database unreachable). */
export function FatalState({ code }: { code: ErrorCode }) {
  const copy = ERROR_COPY[code];
  const signIn = code === "unauthorized" || code === "session_expired";
  return (
    <div className="ui-surface" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div className="ui-card ui-card-pad ui-enter" style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ color: "var(--deep-green)" }}>
          <Wordmark />
        </span>
        <h1 className="ui-h2">{copy.title}</h1>
        <p className="ui-muted">{copy.detail}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {signIn ? (
            <Link href="/login" className="btn btn-dark btn-sm">
              Sign in
            </Link>
          ) : (
            <a href="" className="btn btn-dark btn-sm">
              Try again
            </a>
          )}
          <Link href="/" className="btn btn-outline btn-sm">
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
