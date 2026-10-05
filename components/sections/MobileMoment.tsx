"use client";

import { CSSProperties, useRef } from "react";
import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { useViewportProgress } from "@/components/motion/hooks";
import { LogoMark } from "@/components/Logo";
import { glance, TRY_HREF } from "@/lib/demo";
import s from "./MobileMoment.module.css";

const ROWS = [
  { label: "High intent", value: glance.highIntent, level: 3, tag: "Reply first" },
  { label: "Overdue", value: glance.overdue, level: 2, tag: "Follow up" },
  { label: "Waiting for customer", value: glance.waiting, level: 1, tag: "Nudge later" },
  { label: "Suggested replies ready", value: 4, level: 1, tag: "Review" },
];

export function MobileMoment() {
  const stage = useRef<HTMLDivElement>(null);
  const p = useViewportProgress(stage);
  // Phone rises and settles as the section scrolls in.
  const lift = Math.max(0, 1 - p * 1.8);

  return (
    <section className={s.section}>
      <div className="container">
        <header className={s.head}>
          <BlurWords text="Your day, decided at a glance." className={`display ${s.title}`} breaks={[3]} />
          <Reveal as="p" className="lede" delay={350}>
            Between customers, open FollowUpOS on your phone and see exactly where your attention
            should go next.
          </Reveal>
          <Reveal delay={500}>
            <a href={TRY_HREF} className="btn btn-outline">
              Try FollowUpOS
            </a>
          </Reveal>
        </header>
      </div>

      <div ref={stage} className={s.stage}>
        <div
          className={s.phone}
          style={{ "--lift": lift } as CSSProperties}
          role="img"
          aria-label="Example FollowUpOS mobile screen: 12 conversations need attention, 7 high intent, 3 overdue, 2 waiting for customer"
        >
          <div className={s.screen}>
            <div className={s.status} aria-hidden="true">
              <span>9:41</span>
              <span className={s.icons}>
                <i />
                <i />
                <b />
              </span>
            </div>
            <div className={s.appBar}>
              <span>
                <LogoMark size={16} /> FollowUpOS
              </span>
              <span className={s.me}>A</span>
            </div>
            <p className={`serif ${s.big}`}>
              <CountUp to={glance.attention} /> conversations need attention.
            </p>
            <div className={s.list}>
              {ROWS.map((r) => (
                <div key={r.label} className={s.row}>
                  <span className={s.rowLabel}>{r.label}</span>
                  <span className={s.meter} aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <i key={n} data-on={n <= r.level} />
                    ))}
                  </span>
                  <span className={s.rowValue}>
                    <CountUp to={r.value} duration={900} delay={200} />
                  </span>
                  <span className={s.rowTag}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
