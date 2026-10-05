"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, useState } from "react";
import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { PriorityPill, IntentLabel, StatusDot } from "@/components/product";
import s from "./Beliefs.module.css";

type Belief = {
  quote: string;
  source: string;
  tone: "green" | "ember" | "forest" | "sand";
  visual: ReactNode;
};

const BELIEFS: Belief[] = [
  {
    quote: "Your customers don’t need another chatbot. You need to know what happens next.",
    source: "The FollowUpOS principle",
    tone: "green",
    visual: (
      <Image
        src="/images/owner-on-phone.avif"
        alt=""
        fill
        sizes="(max-width: 760px) 80vw, 340px"
        style={{ objectFit: "cover", objectPosition: "52% 30%" }}
      />
    ),
  },
  {
    quote: "Nothing goes out without you. FollowUpOS suggests — the owner decides.",
    source: "On replies",
    tone: "ember",
    visual: (
      <div className={s.vReply}>
        <p className="serif">“Sunday works — 11:30 or 4:00?”</p>
        <span className={s.vBtn}>Review &amp; send</span>
        <span className={s.vBtnGhost}>Edit</span>
      </div>
    ),
  },
  {
    quote: "Signals, not summaries. Tell me who is ready to buy, not just what they wrote.",
    source: "On clarity",
    tone: "forest",
    visual: (
      <div className={s.vStack}>
        <PriorityPill priority="high">High intent</PriorityPill>
        <IntentLabel>Booking enquiry</IntentLabel>
        <IntentLabel>Blocker · Availability</IntentLabel>
      </div>
    ),
  },
  {
    quote: "A conversation isn’t finished until it’s resolved — booked, sold, or closed.",
    source: "On follow-through",
    tone: "sand",
    visual: (
      <div className={s.vDone}>
        <span className={s.vCheck}>✓</span>
        <p className="serif">Booked</p>
        <StatusDot status="done">Resolved</StatusDot>
      </div>
    ),
  },
];

export function Beliefs() {
  const [index, setIndex] = useState(0);
  const go = (i: number) => setIndex((i + BELIEFS.length) % BELIEFS.length);

  return (
    <section className={s.section}>
      <div className="container">
        <header className={s.head}>
          <BlurWords text="No chatbots. Just next steps." className={`display ${s.title}`} breaks={[2]} />
          <Reveal as="p" className={`lede ${s.lede}`} delay={400}>
            Not testimonials — the principles FollowUpOS is designed around.
          </Reveal>
        </header>

        <Reveal className={s.viewport}>
          <div className={s.track} style={{ "--i": index } as CSSProperties}>
            {BELIEFS.map((b, i) => (
              <div key={i} className={s.slide} data-on={i === index} aria-hidden={i !== index}>
                <blockquote className={s.quote} data-tone={b.tone}>
                  <span className={`serif ${s.mark}`} aria-hidden="true">
                    “
                  </span>
                  <p className="serif">{b.quote}</p>
                  <cite>{b.source}</cite>
                </blockquote>
                <div className={s.visual} data-tone={b.tone}>
                  {b.visual}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className={s.controls}>
          <div className={s.pages}>
            <span className={s.diamond} aria-hidden="true" />
            {BELIEFS.map((_, i) => (
              <button key={i} data-on={i === index} onClick={() => go(i)} aria-label={`Principle ${i + 1}`}>
                0{i + 1}
              </button>
            ))}
          </div>
          <div className={s.arrows}>
            <button onClick={() => go(index - 1)} aria-label="Previous principle">
              ←
            </button>
            <button onClick={() => go(index + 1)} aria-label="Next principle" data-primary>
              →
            </button>
          </div>
        </div>
        <hr className={s.rule} />
      </div>
    </section>
  );
}
