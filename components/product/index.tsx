import { ReactNode } from "react";
import type { Conversation, Priority } from "@/lib/demo";
import { LogoMark } from "@/components/Logo";
import s from "./product.module.css";

type Tone = "light" | "dark";

export function PriorityPill({ priority, tone = "light", children }: { priority: Priority; tone?: Tone; children?: ReactNode }) {
  return (
    <span className={s.pill} data-priority={priority} data-tone={tone}>
      {children ?? (priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low")}
    </span>
  );
}

export function IntentLabel({ children, tone = "light" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={s.intent} data-tone={tone}>
      {children}
    </span>
  );
}

export type Status = "live" | "waiting" | "overdue" | "done";

export function StatusDot({ status, children, tone = "light" }: { status: Status; children: ReactNode; tone?: Tone }) {
  return (
    <span className={s.status} data-status={status} data-tone={tone}>
      {children}
    </span>
  );
}

export function SignalField({ label, value, tone = "light" }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className={s.field} data-tone={tone}>
      <span className={s.fieldLabel}>{label}</span>
      <span className={s.fieldValue}>{value}</span>
    </div>
  );
}

export function ConversationRow({
  conversation: c,
  active = false,
  tone = "light",
  showPreview = false,
}: {
  conversation: Conversation;
  active?: boolean;
  tone?: Tone;
  showPreview?: boolean;
}) {
  return (
    <div className={s.row} data-active={active} data-tone={tone}>
      <span className={s.avatar} aria-hidden="true">
        {c.customer.charAt(0)}
      </span>
      <div className={s.rowHead}>
        <PriorityPill priority={c.priority} tone={tone} />
        <span className={s.subject}>{c.subject}</span>
      </div>
      <span className={s.time}>{c.waiting}</span>
      <div className={s.rowMeta}>
        {showPreview ? (
          <span>“{c.preview}”</span>
        ) : (
          <>
            <IntentLabel tone={tone}>{c.intent}</IntentLabel>
            <span className={s.arrow} aria-hidden="true">
              →
            </span>
            <span className={s.action}>{c.nextAction}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function NextActionCard({ action, tone = "light" }: { action: string; tone?: Tone }) {
  return (
    <div className={s.next} data-tone={tone}>
      <span className={s.nextIcon} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <div className={s.nextLabel}>Next action</div>
        <div className={s.nextText}>{action}</div>
      </div>
    </div>
  );
}

export function SuggestedReply({
  text,
  tone = "light",
  actions = true,
}: {
  text: string;
  tone?: Tone;
  actions?: boolean;
}) {
  return (
    <div className={s.reply} data-tone={tone}>
      <div className={s.replyHead}>
        <span className={s.replyLabel}>
          <LogoMark size={13} /> Suggested reply
        </span>
      </div>
      <p className={s.replyText}>“{text}”</p>
      {actions && (
        <div className={s.replyActions} aria-hidden="true">
          <span className={`${s.replyBtn} ${s.replyBtnPrimary}`} style={{ display: "inline-flex", alignItems: "center" }}>
            Review &amp; send
          </span>
          <span className={s.replyBtn} style={{ display: "inline-flex", alignItems: "center" }}>
            Edit
          </span>
        </div>
      )}
    </div>
  );
}

export function Metric({ value, label, tone = "light" }: { value: ReactNode; label: string; tone?: Tone }) {
  return (
    <div className={s.metric} data-tone={tone}>
      <span className={s.metricValue}>{value}</span>
      <span className={s.metricLabel}>{label}</span>
    </div>
  );
}

/** Small brand chip that marks a visual as example UI (the reference's "Shyen.AI · Powered by" chip). */
export function DemoBadge({ note = "Example data" }: { note?: string }) {
  return (
    <span className={s.demo}>
      <LogoMark size={18} />
      <span className={s.demoName}>FollowUpOS</span>
      <span className={s.demoSep} />
      <span className={s.demoNote}>{note}</span>
    </span>
  );
}
