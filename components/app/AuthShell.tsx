import Link from "next/link";
import { ReactNode } from "react";
import { Wordmark } from "@/components/Logo";
import { PriorityPill, SignalField } from "@/components/product";
import s from "./AuthShell.module.css";

/** Split layout echoing the landing hero: gradient panel + form on paper. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={s.shell}>
      <aside className={s.panel} aria-hidden="true">
        <Link href="/" className={s.brand} tabIndex={-1}>
          <Wordmark />
        </Link>
        <figure className={s.card}>
          <p className="serif">“Hi, are you available Sunday? How much for haircut + beard?”</p>
          <div className={s.rule} />
          <div className={s.signal}>
            <PriorityPill priority="high" tone="dark">
              High intent
            </PriorityPill>
            <span className="serif">Booking enquiry</span>
          </div>
          <SignalField tone="dark" label="Next action" value="Ask for preferred appointment time" />
        </figure>
        <p className={`serif ${s.tagline}`}>Every customer conversation has a next step.</p>
      </aside>

      <main className={s.main}>
        <Link href="/" className={s.mobileBrand}>
          <Wordmark />
        </Link>
        <div className={`${s.form} ui-enter`}>
          <h1 className="ui-title">{title}</h1>
          {subtitle && <p className={`ui-muted ${s.subtitle}`}>{subtitle}</p>}
          <div className={s.body}>{children}</div>
          {footer && <div className={s.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}
