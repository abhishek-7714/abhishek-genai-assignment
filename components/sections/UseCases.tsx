"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { useInView } from "@/components/motion/hooks";
import { LogoMark } from "@/components/Logo";
import { IntentLabel, PriorityPill } from "@/components/product";
import { useCases } from "@/lib/demo";
import s from "./UseCases.module.css";

const INTERVAL = 5000;

export function UseCases() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.35, once: false });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = useCases[active];

  useEffect(() => {
    if (!inView || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % useCases.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [inView, paused, active]);

  return (
    <section
      ref={ref}
      id="businesses"
      className={s.section}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={s.field} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="container">
        <Reveal variant="scale" className={s.card}>
          <div className={s.left}>
            <span className={s.kicker}>
              <LogoMark size={16} /> For businesses
            </span>
            <h2 className={`serif ${s.title}`}>
              Every business
              <br /> sounds different.
            </h2>

            <div className={s.stat} key={`stat-${current.id}`}>
              <div>
                <div className={s.statTop}>
                  <PriorityPill priority={current.priority} tone="dark" />
                  <span>{current.intent}</span>
                </div>
                <span className={s.statSub}>Next: {current.nextAction}</span>
              </div>
              <span className={`serif ${s.statNum}`}>0{active + 1}</span>
            </div>

            <p className={s.note} key={`note-${current.id}`}>
              {current.note}
            </p>
          </div>

          <div className={s.middle}>
            <div className={s.quoteWrap} aria-live="polite">
              <span className={s.who} key={`who-${current.id}`}>
                {current.label}
              </span>
              <p className={`serif ${s.quote}`} key={`q-${current.id}`}>
                “{current.message}”
              </p>
            </div>
            <div className={s.pager} role="tablist" aria-label="Business examples">
              <span className={s.ring} aria-hidden="true">
                <svg viewBox="0 0 20 20" key={`ring-${active}-${paused}`}>
                  <circle cx="10" cy="10" r="8" />
                  <circle cx="10" cy="10" r="8" className={inView && !paused ? s.ringRun : ""} />
                </svg>
              </span>
              {useCases.map((u, i) => (
                <button
                  key={u.id}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={u.label}
                  className={s.page}
                  data-on={i === active}
                  onClick={() => setActive(i)}
                >
                  0{i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className={s.object} key={`obj-${current.id}`} aria-hidden="true">
            <div className={s.device}>
              <span className={s.deviceTop}>
                <LogoMark size={14} />
                <span>New message</span>
              </span>
              <div className={s.incoming}>{current.message}</div>
              <div className={s.arrow}>↓</div>
              <div className={s.extract}>
                <PriorityPill priority={current.priority}>{current.priority === "high" ? "High intent" : "Medium"}</PriorityPill>
                <IntentLabel>{current.intent}</IntentLabel>
                <span className={s.extractNext}>{current.nextAction}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
