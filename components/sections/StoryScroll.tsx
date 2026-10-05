"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useMediaQuery, useStickyProgress } from "@/components/motion/hooks";
import { Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/Logo";
import {
  ConversationRow,
  NextActionCard,
  PriorityPill,
  SignalField,
  StatusDot,
  SuggestedReply,
} from "@/components/product";
import { attentionQueue, heroSignal, TRY_HREF } from "@/lib/demo";
import s from "./StoryScroll.module.css";

type Step = {
  key: string;
  label: string;
  title: string;
  desc: string;
  icon: ReactNode;
  screen: ReactNode;
};

const Icon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STEPS: Step[] = [
  {
    key: "understand",
    label: "Understand",
    title: "What does the customer actually want?",
    desc: "Every message is read for intent, sentiment and the details that matter — even when it’s short, informal or written in two languages.",
    icon: <Icon d="M2 8s2.2-4.5 6-4.5S14 8 14 8s-2.2 4.5-6 4.5S2 8 2 8Z M8 9.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />,
    screen: (
      <>
        <div className={s.msg}>“{heroSignal.message}”</div>
        <div className={s.fields}>
          <SignalField tone="dark" label="Wants" value="Haircut + beard" />
          <SignalField tone="dark" label="When" value="This Sunday" />
          <SignalField tone="dark" label="Asking" value="Price, availability" />
        </div>
        <div className={s.inline}>
          <PriorityPill priority="high" tone="dark">
            High intent
          </PriorityPill>
          <span className={s.dim}>Booking enquiry</span>
        </div>
      </>
    ),
  },
  {
    key: "prioritize",
    label: "Prioritize",
    title: "Which conversations deserve attention first?",
    desc: "Conversations are ranked by how likely they are to turn into business and how soon they need you, so the important ones stop getting buried.",
    icon: <Icon d="M3 4h10M3 8h7M3 12h4" />,
    screen: (
      <div className={s.rows}>
        {[attentionQueue[0], attentionQueue[3], attentionQueue[2]].map((c, i) => (
          <ConversationRow key={c.id} conversation={c} tone="dark" active={i === 0} />
        ))}
      </div>
    ),
  },
  {
    key: "respond",
    label: "Respond",
    title: "What should the owner say?",
    desc: "A suggested reply that answers the actual question and moves the customer one step closer. You review it, edit it, and send it.",
    icon: <Icon d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2v-7Z" />,
    screen: (
      <>
        <div className={s.msg}>“{heroSignal.message}”</div>
        <SuggestedReply tone="dark" text={heroSignal.reply} />
      </>
    ),
  },
  {
    key: "follow",
    label: "Follow up",
    title: "What should the owner do next?",
    desc: "When a customer goes quiet, FollowUpOS notices and suggests the nudge — before a warm lead goes cold.",
    icon: <Icon d="M8 2.5v5.5l3.5 2 M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z" />,
    screen: (
      <>
        <ul className={s.timeline}>
          <li>
            <StatusDot status="done" tone="dark">
              Reply sent · 10:02
            </StatusDot>
          </li>
          <li>
            <StatusDot status="done" tone="dark">
              Seen · 10:15
            </StatusDot>
          </li>
          <li>
            <StatusDot status="overdue" tone="dark">
              No reply for 6 hours
            </StatusDot>
          </li>
        </ul>
        <NextActionCard tone="dark" action="Nudge: “Still keen on Sunday? I have 11:30 free.”" />
      </>
    ),
  },
  {
    key: "resolve",
    label: "Resolve",
    title: "Has the conversation actually been completed?",
    desc: "Conversations close when the outcome is real — booked, sold, or not interested — so your queue only shows what’s still open.",
    icon: <Icon d="M3 8.5 6.5 12 13 4.5" />,
    screen: (
      <>
        <div className={s.done}>
          <span className={s.check}>
            <Icon d="M3 8.5 6.5 12 13 4.5" />
          </span>
          <div>
            <div className="serif" style={{ fontSize: "1.5rem", lineHeight: 1.1 }}>
              Booked · Sunday 11:30
            </div>
            <span className={s.dim}>Haircut + beard · Rahul M.</span>
          </div>
        </div>
        <ul className={s.checklist}>
          <li>Intent understood</li>
          <li>Price and availability shared</li>
          <li>Time confirmed</li>
        </ul>
        <StatusDot status="done" tone="dark">
          Resolved — moved out of your queue
        </StatusDot>
      </>
    ),
  },
];

const N = STEPS.length;
/**
 * The wave: a straight line with a bulge whose peak sits at `y`.
 * `skew` (-1 → 1) stretches the trailing side and tightens the leading side
 * while the wave is travelling, so it reads as one flowing shape.
 */
function curvePath(y: number, skew: number) {
  const h = 300;
  const up = h * (1 + 0.38 * skew);
  const down = h * (1 - 0.38 * skew);
  const depth = 14 + Math.abs(skew) * 6;
  return `M 96 -400 L 96 ${y - up} C 96 ${y - up / 2}, ${depth} ${y - up * 0.42}, ${depth} ${y} C ${depth} ${y + down * 0.42}, 96 ${y + down / 2}, 96 ${y + down} L 96 1400`;
}

/**
 * Maps scroll progress to a step position that slows near each step
 * but never stops (the derivative stays above zero), so motion is continuous.
 */
function flowPosition(progress: number) {
  const f = progress * (N - 1);
  return f - (0.55 * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
}

/** Follows the target with a critically damped glide and reports the motion as skew. */
function useWave(target: number, enabled: boolean) {
  const [state, setState] = useState({ pos: target, skew: 0 });
  const targetRef = useRef(target);
  const current = useRef({ pos: target, skew: 0 });
  const frame = useRef(0);
  targetRef.current = target;

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = { pos: target, skew: 0 };
      setState(current.current);
      return;
    }
    if (frame.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const c = current.current;
      const diff = targetRef.current - c.pos;
      const pos = c.pos + diff * (1 - Math.exp(-dt / 140));
      // velocity in steps per second → skew, eased so it swells and relaxes gently
      const velocity = ((pos - c.pos) / dt) * 1000;
      const goal = Math.max(-1, Math.min(1, velocity * 0.9));
      const skew = c.skew + (goal - c.skew) * (1 - Math.exp(-dt / 120));
      current.current = { pos, skew };
      setState(current.current);
      if (Math.abs(diff) > 0.0005 || Math.abs(skew) > 0.002) {
        frame.current = requestAnimationFrame(tick);
      } else {
        current.current = { pos: targetRef.current, skew: 0 };
        setState(current.current);
        frame.current = 0;
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [target, enabled]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return state;
}

function Screen({ step }: { step: Step }) {
  return (
    <div className={s.screen}>
      <div className={s.screenBar}>
        <span>{step.label}</span>
        <LogoMark size={15} />
      </div>
      <div className={s.screenBody}>{step.screen}</div>
    </div>
  );
}

export function StoryScroll() {
  const wrap = useRef<HTMLElement>(null);
  const desktop = useMediaQuery("(min-width: 901px)");
  const progress = useStickyProgress(wrap, desktop);

  const { pos, skew } = useWave(flowPosition(progress), desktop);
  const active = Math.min(N - 1, Math.max(0, Math.round(pos)));
  const y = ((pos + 0.5) / N) * 1000;

  const jumpTo = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const distance = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (i / (N - 1)) * distance + 2, behavior: "smooth" });
  };

  if (!desktop) {
    return (
      <section id="how" className={s.mobile}>
        <div className="container">
          <Reveal as="h2" className={`display ${s.mobileTitle}`}>
            From message to done.
          </Reveal>
          <ol className={s.mobileList}>
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.key} className={s.mobileStep}>
                <div className={s.mobileHead}>
                  <span className={s.icon}>{step.icon}</span>
                  <span className="serif">
                    <span className={s.stepNum}>0{i + 1}</span> {step.label}
                  </span>
                </div>
                <h3 className={s.panelTitle}>{step.title}</h3>
                <p className={s.panelDesc}>{step.desc}</p>
                <Screen step={step} />
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={wrap} className={s.wrap} style={{ height: `${N * 75 + 100}vh` }}>
      <div className={s.sticky}>
        <div className={`container ${s.layout}`}>
          <div className={s.listCol}>
            <p className={s.kicker}>How it works</p>
            <ol className={s.list}>
              {STEPS.map((step, i) => (
                <li key={step.key}>
                  <button className={s.item} data-on={i === active} onClick={() => jumpTo(i)}>
                    <span className={s.icon}>{step.icon}</span>
                    <span className="serif">{step.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className={s.curveCol} aria-hidden="true">
            <svg viewBox="0 0 100 1000" preserveAspectRatio="none" className={s.curve}>
              <defs>
                <linearGradient id="curveStroke" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
                  <stop offset={Math.max(0, (y - 300) / 1000)} stopColor="#b9cbbf" />
                  <stop offset={y / 1000} stopColor="#111312" />
                  <stop offset={Math.min(1, (y + 300) / 1000)} stopColor="#b9cbbf" />
                </linearGradient>
              </defs>
              <path d="M 96 0 L 96 1000" className={s.straight} />
              <path d={curvePath(y, skew)} stroke="url(#curveStroke)" className={s.bend} />
            </svg>
            <span className={s.dot} style={{ top: `${y / 10}%` } as CSSProperties} />
          </div>

          <div className={s.panelCol}>
            {STEPS.map((step, i) => (
              <article key={step.key} className={s.panel} data-on={i === active} aria-hidden={i !== active}>
                <Screen step={step} />
                <h3 className={s.panelTitle}>{step.title}</h3>
                <p className={s.panelDesc}>{step.desc}</p>
                <a href={TRY_HREF} className={s.panelCta} tabIndex={i === active ? 0 : -1}>
                  <LogoMark size={15} />
                  <span>Try FollowUpOS</span>
                  <span className={s.panelArrow}>↗</span>
                </a>
              </article>
            ))}
          </div>
        </div>
        <div className={s.progress} aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </section>
  );
}
