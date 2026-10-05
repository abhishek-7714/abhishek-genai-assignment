"use client";

import { CSSProperties, useEffect, useState } from "react";
import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { useInView } from "@/components/motion/hooks";
import { LogoMark } from "@/components/Logo";
import s from "./Connected.module.css";

const FLOW = ["Gmail", "FollowUpOS", "Understand", "Prioritize", "Respond", "Owner reviews"];

// 1 = needs attention, 2 = handled, 0 = quiet
const INBOX = [
  2, 2, 1, 0, 2, 1, 2,
  1, 2, 2, 1, 2, 0, 1,
  2, 1, 2, 2, 1, 2, 1,
  1, 0, 2, 1, 0, 0, 0,
];

function EnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="m2.5 4.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const CARDS = 4;

export function Connected() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35, once: false });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setStep((v) => (v + 1) % CARDS), 3200);
    return () => window.clearInterval(id);
  }, [inView]);

  return (
    <section className={s.section}>
      <div className={s.sunrise} aria-hidden="true" />
      <div className="container">
        <header className={s.head}>
          <BlurWords text="Starts where your customers already write." className={`display ${s.title}`} breaks={[3]} />
          <Reveal as="p" className={`lede ${s.lede}`} delay={400}>
            Connect Gmail and FollowUpOS reads new enquiries as they arrive — then understands,
            prioritises and drafts a response for you to review.
          </Reveal>
        </header>

        <Reveal variant="scale" className={s.stage}>
          <div className={s.texture} aria-hidden="true" />
          <div className={s.stageCopy}>
            <h3 className="serif">Gmail in. Clear next actions out.</h3>
            <ul className={s.chips}>
              <li>Understand</li>
              <li>Prioritize</li>
              <li>Respond</li>
            </ul>
          </div>

          <div ref={ref} className={s.rail}>
            <div className={s.track} style={{ "--step": Math.min(step, CARDS - 2) } as CSSProperties}>
              {/* 1. Inbox at a glance */}
              <article className={s.glass} data-on={step === 0}>
                <h4 className="serif">Monday inbox</h4>
                <div className={s.dotGrid} aria-hidden="true">
                  {INBOX.map((v, i) => (
                    <i key={i} data-v={v} style={{ "--i": i } as CSSProperties} />
                  ))}
                </div>
                <p className={s.glassNote}>
                  <span className={s.key} /> needs attention
                </p>
              </article>

              {/* 2. Orbit */}
              <article className={s.glass} data-on={step === 1}>
                <div className={s.orbit} aria-hidden="true">
                  <div className={s.ring}>
                    <span className={s.planet} style={{ "--a": "0deg" } as CSSProperties}>
                      <EnvelopeIcon />
                    </span>
                    <span className={s.planet} style={{ "--a": "90deg" } as CSSProperties}>
                      U
                    </span>
                    <span className={s.planet} style={{ "--a": "180deg" } as CSSProperties}>
                      P
                    </span>
                    <span className={s.planet} style={{ "--a": "270deg" } as CSSProperties}>
                      R
                    </span>
                  </div>
                  <span className={s.core}>
                    <LogoMark size={26} />
                  </span>
                </div>
                <p className={s.glassNote}>Gmail · Understand · Prioritize · Respond</p>
              </article>

              {/* 3. Flow */}
              <article className={s.glass} data-on={step === 2}>
                <ol className={s.flow}>
                  {FLOW.map((f, i) => (
                    <li key={f} style={{ "--i": i } as CSSProperties} data-brand={f === "FollowUpOS" || undefined}>
                      {f === "Gmail" ? <EnvelopeIcon /> : f === "FollowUpOS" ? <LogoMark size={15} /> : <span className={s.flowDot} />}
                      {f}
                    </li>
                  ))}
                </ol>
              </article>

              {/* 4. Owner reviews */}
              <article className={s.glass} data-on={step === 3}>
                <span className={s.reviewLabel}>Owner reviews</span>
                <p className={`serif ${s.reviewText}`}>
                  “Hi! Sunday works — I have 11:30 or 4:00 free. Which suits you?”
                </p>
                <div className={s.reviewActions}>
                  <span>Approve</span>
                  <span>Edit</span>
                </div>
              </article>
            </div>
            <div className={s.progress} aria-hidden="true">
              <span style={{ width: `${((step + 1) / CARDS) * 100}%` }} />
            </div>
          </div>
        </Reveal>

        <Reveal as="p" className={s.footnote} delay={200}>
          Gmail connection is in development. This is a preview of how it will work — nothing on this
          page is connected to your account.
        </Reveal>
      </div>
    </section>
  );
}
