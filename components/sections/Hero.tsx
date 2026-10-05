"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BlurWords } from "@/components/motion/Reveal";
import { LogoMark, Wordmark } from "@/components/Logo";
import { PriorityPill, SignalField } from "@/components/product";
import { heroSignal, TRY_HREF } from "@/lib/demo";
import s from "./Hero.module.css";

const NAV = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#businesses", label: "For businesses" },
];

export function Hero() {
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <header className={s.hero} data-ready={ready}>
      <div className={s.panel}>
        <div className={s.glow} aria-hidden="true" />

        <nav className={s.nav} data-open={menuOpen} aria-label="Primary">
          <div className={s.navBar}>
            <a href="#top" className={s.brand} aria-label="FollowUpOS home">
              <Wordmark />
            </a>
            <ul className={s.navLinks}>
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
            <button
              className={s.burger}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
            </button>
          </div>
          <div className={s.menu}>
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="serif">
                {item.label}
              </a>
            ))}
            <a href={TRY_HREF} className="btn btn-light btn-sm" onClick={() => setMenuOpen(false)}>
              Try FollowUpOS
            </a>
          </div>
        </nav>

        <div className={s.copy}>
          <BlurWords as="h1" text="Your inbox never stops." className={s.title} play={ready} delay={250} breaks={[2]} />
          <p className={s.sub}>
            FollowUpOS tells you what needs attention. It turns customer conversations into clear next
            actions — who to reply to, what to say, and what to do next.
          </p>
          <div className={s.ctaBar}>
            <a href="#how" className={s.ctaGhost}>
              See how it works
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2v9.5M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href={TRY_HREF} className="btn btn-light">
              Try FollowUpOS
            </a>
          </div>
        </div>
      </div>

      <div className={s.media}>
        <Image
          src="/images/owner-on-phone.avif"
          alt="A small business owner answering a customer on her phone while working at her laptop"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          className={s.photo}
        />
        <div className={s.mediaShade} aria-hidden="true" />

        <a href={TRY_HREF} className={`btn btn-light btn-sm ${s.mediaCta}`}>
          Try FollowUpOS
        </a>

        <figure className={s.signal} aria-label="Example: a customer message turned into a next action">
          <div className={s.signalMsg}>
            <span className={s.signalFrom}>
              <span className={s.signalAvatar}>R</span>
              {heroSignal.customer}
              <span className={s.signalTime}>9:41</span>
            </span>
            <p className="serif">“{heroSignal.message}”</p>
          </div>
          <div className={s.scan} aria-hidden="true" />
          <div className={s.signalOut}>
            <div className={s.signalTop}>
              <PriorityPill priority="high" tone="dark">
                High intent
              </PriorityPill>
              <span className={`serif ${s.signalIntent}`}>{heroSignal.intent}</span>
            </div>
            <div className={s.signalGrid}>
              <SignalField tone="dark" label="Likely blocker" value={heroSignal.blocker} />
              <SignalField tone="dark" label="Next action" value={heroSignal.nextAction} />
            </div>
          </div>
        </figure>

        <ul className={s.chips} aria-hidden="true">
          <li>Intent</li>
          <li>Priority</li>
          <li>Next action</li>
        </ul>

        <div className={s.pager} aria-hidden="true">
          <LogoMark size={20} />
          <span className={s.dots}>
            <i />
            <i />
            <i data-on />
          </span>
        </div>
      </div>
    </header>
  );
}
