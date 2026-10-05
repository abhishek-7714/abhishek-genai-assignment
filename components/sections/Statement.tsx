"use client";

import { CSSProperties } from "react";
import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { useInView } from "@/components/motion/hooks";
import { LogoMark } from "@/components/Logo";
import s from "./Statement.module.css";

const SIGNALS = [
  { key: "intent", label: "Intent", text: "Purchase enquiry — a 2kg chocolate cake, for Saturday." },
  { key: "priority", label: "Priority", text: "High. There’s a date, a size and a reason to buy." },
  { key: "sentiment", label: "Sentiment", text: "Warm and excited. She’s ready to order." },
  { key: "blocker", label: "Blocker", text: "She doesn’t know the price yet." },
  { key: "next", label: "Next action", text: "Reply today with the price and two flavour options." },
];

export function Statement() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });

  return (
    <section className={s.section}>
      <div className="container">
        <header className={s.head}>
          <BlurWords
            text="Every customer conversation has a next step."
            className={`display ${s.title}`}
            breaks={[3]}
          />
          <Reveal as="p" className={`lede ${s.lede}`} delay={500}>
            Behind every message is a customer deciding whether to buy. FollowUpOS reads what they
            asked — and what they meant.
          </Reveal>
        </header>

        <div ref={ref} className={s.thread} data-in={inView}>
          <div className={`${s.item} ${s.customer}`} style={{ "--d": "0ms" } as CSSProperties}>
            <div className={s.bubble}>
              <span className="serif">Hi!</span> Can you make a 2kg chocolate cake for Saturday? It’s for my
              daughter’s birthday.
            </div>
            <div className={s.who}>
              <span className={s.face}>P</span>
              <span className="serif">Priya · customer</span>
            </div>
          </div>

          {SIGNALS.map((sig, i) => (
            <div
              key={sig.key}
              className={`${s.item} ${s[sig.key]}`}
              style={{ "--d": `${500 + i * 260}ms` } as CSSProperties}
            >
              <div className={s.bubble} data-signal>
                <span className={s.label}>
                  <LogoMark size={13} />
                  <span className="serif">{sig.label}</span>
                </span>
                <span className={s.text}>{sig.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
