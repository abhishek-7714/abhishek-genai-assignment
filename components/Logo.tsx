type MarkProps = { size?: number; className?: string };

/** FollowUpOS mark: a conversation loop that resolves into a forward step. */
export function LogoMark({ size = 22, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3.25a8.75 8.75 0 1 0 8.6 10.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 7.5a4.5 4.5 0 1 0 4.4 5.45"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M14.6 10.6h6.15V4.45"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <LogoMark />
      <span className="serif" style={{ fontSize: "1.32rem", letterSpacing: "-0.02em", lineHeight: 1 }}>
        FollowUpOS
      </span>
    </span>
  );
}
