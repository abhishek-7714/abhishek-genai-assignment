"use client";

import { CSSProperties } from "react";
import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { useInView } from "@/components/motion/hooks";
import { DemoBadge, SuggestedReply } from "@/components/product";
import { heroSignal } from "@/lib/demo";
import s from "./Signal.module.css";

// Trace nodes, in % of the chart box.
const NODES = [
  { x: 6, y: 88, label: "Message", value: "Received" },
  { x: 29, y: 70, label: "Intent", value: "Booking enquiry" },
  { x: 52, y: 52, label: "Priority", value: "High" },
  { x: 75, y: 36, label: "Blocker", value: "Availability" },
  { x: 95, y: 12, label: "Next action", value: "Ask for preferred time", accent: true },
];

const PATH = "M 36 317 C 110 300, 140 262, 174 252 S 270 200, 312 187 S 410 140, 450 130 S 540 70, 570 43";
const AREA = `${PATH} L 570 360 L 36 360 Z`;

const BUSINESSES = [
  "Salons",
  "Barbers",
  "Home bakeries",
  "Photographers",
  "Tutors",
  "Fitness studios",
  "Boutiques",
  "Caterers",
  "Event planners",
  "Clinics",
];

export function Signal() {
  const chart = useInView<HTMLDivElement>({ threshold: 0.35 });
  const dial = useInView<HTMLDivElement>({ threshold: 0.4 });

  return (
    <section className={s.section} id="product">
      <div className={s.glow} aria-hidden="true" />
      <div className="container">
        <header className={s.head}>
          <BlurWords text="One message. Everything you need to know." className={`display ${s.title}`} breaks={[2]} />
          <Reveal as="p" className={`lede ${s.lede}`} delay={450}>
            FollowUpOS turns a single customer message into signals you can act on — without reading it
            three times.
          </Reveal>
        </header>

        <Reveal className={s.big} variant="scale">
          <div className={s.bigCopy}>
            <div className={s.bigNum}>
              <CountUp to={4} duration={1200} delay={300} />
              <span className={s.bigUnit}>signals</span>
            </div>
            <p className={`serif ${s.quote}`}>“{heroSignal.message}”</p>
            <p className={s.desc}>
              Read once, the way an experienced owner would: what they want, how urgent it is, what’s
              stopping them, and what to do next.
            </p>
            <div className={s.badge}>
              <DemoBadge note="Example analysis" />
            </div>
          </div>

          <div ref={chart.ref} className={s.chart} data-in={chart.inView}>
            <span className={s.axisY}>Clarity</span>
            <span className={s.chartTag}>Signal</span>
            <div className={s.plot}>
              <svg viewBox="0 0 600 360" className={s.svg} aria-hidden="true">
                <defs>
                  <linearGradient id="sigArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#245247" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#245247" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="sigLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8fb3a2" />
                    <stop offset="100%" stopColor="#16352d" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="36" x2="600" y1={40 + i * 90} y2={40 + i * 90} className={s.grid} />
                ))}
                {NODES.map((n, i) => (
                  <line key={i} x1={n.x * 6} x2={n.x * 6} y1={n.y * 3.6} y2="360" className={s.stem} />
                ))}
                <path d={AREA} fill="url(#sigArea)" className={s.area} />
                <path d={PATH} fill="none" stroke="url(#sigLine)" strokeWidth="2.5" pathLength={1} className={s.line} />
              </svg>
              {NODES.map((n, i) => (
                <span
                  key={n.label}
                  className={s.node}
                  data-accent={n.accent || undefined}
                  style={{ left: `${n.x}%`, top: `${n.y}%`, "--d": `${600 + i * 320}ms` } as CSSProperties}
                />
              ))}
            </div>
            <ul className={s.tags}>
              {NODES.slice(1).map((n, i) => (
                <li
                  key={n.label}
                  data-accent={n.accent || undefined}
                  style={{ "--x": `${n.x}%`, "--y": `${n.y}%`, "--d": `${900 + i * 320}ms` } as CSSProperties}
                >
                  <span className={s.tagLabel}>{n.label}</span>
                  <span>{n.value}</span>
                </li>
              ))}
            </ul>
            <div className={s.axisX} aria-hidden="true">
              {NODES.map((n) => (
                <span key={n.label} style={{ left: `${n.x}%` }}>
                  {n.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <div className={s.pair}>
          <Reveal className={s.card} delay={0}>
            <div className={s.cardTop}>
              <span className={`serif ${s.cardBig}`}>Availability</span>
              <span className={s.cardTag}>Blocker</span>
            </div>
            <div ref={dial.ref} className={s.dialRow} data-in={dial.inView}>
              <ul className={s.modes} aria-label="Possible blockers">
                <li>Price</li>
                <li data-on>Availability</li>
                <li>Location</li>
              </ul>
              <div className={s.dial} aria-hidden="true">
                <div className={s.dialFill} />
                <i />
                <i />
                <i />
                <i />
                <span className={s.dialLabel}>Sun</span>
              </div>
            </div>
            <h3 className={s.cardTitle}>Likely blocker</h3>
            <p className={s.cardDesc}>The customer can’t commit until they know a Sunday slot is open.</p>
          </Reveal>

          <Reveal className={s.card} delay={140}>
            <div className={s.cardTop}>
              <span className={`serif ${s.cardBig}`}>Drafted</span>
              <span className={s.cardTag}>Reply</span>
            </div>
            <div className={s.replyWrap}>
              <svg className={s.rise} viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="riseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#245247" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#245247" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 140 L400 20 L400 160 L0 160 Z" fill="url(#riseFill)" />
                <path d="M0 140 L400 20" stroke="#245247" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
                <path d="M0 150 L400 90" stroke="#245247" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 5" fill="none" />
              </svg>
              <div className={s.replyCard}>
                <SuggestedReply text={heroSignal.reply} actions={false} />
              </div>
            </div>
            <h3 className={s.cardTitle}>Suggested reply</h3>
            <p className={s.cardDesc}>Written for this customer and this question, ready for you to review before sending.</p>
          </Reveal>
        </div>

        <div className={s.marquee}>
          <p className={s.marqueeLabel}>Designed for small businesses that live in their inbox</p>
          <div className={s.track} aria-hidden="true">
            <div className={s.trackInner}>
              {[...BUSINESSES, ...BUSINESSES].map((b, i) => (
                <span key={i} className="serif">
                  {b}
                </span>
              ))}
            </div>
          </div>
          <p className="sr-only">Salons, barbers, home bakeries, photographers, tutors and more.</p>
        </div>
      </div>
    </section>
  );
}
