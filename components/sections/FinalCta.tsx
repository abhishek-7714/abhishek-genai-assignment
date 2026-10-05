"use client";

import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/Logo";
import { TRY_HREF } from "@/lib/demo";
import s from "./FinalCta.module.css";

export function FinalCta() {
  return (
    <>
      <section className={s.cta}>
        <div className={s.sunset} aria-hidden="true" />
        <div className={`container ${s.inner}`}>
          <BlurWords text="Stop losing customers in your inbox." className={`display ${s.title}`} breaks={[3]} />
          <Reveal as="p" className={s.lede} delay={450}>
            FollowUpOS turns customer conversations into clear next actions.
          </Reveal>
          <Reveal delay={600} className={s.bar}>
            <span className={s.barText}>Start with your next customer message</span>
            <a href={TRY_HREF} className="btn btn-light">
              Try FollowUpOS
            </a>
          </Reveal>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={`container ${s.footGrid}`}>
          <div className={s.about}>
            <p className="serif">
              FollowUpOS turns scattered customer conversations into a prioritized list of
              opportunities and actions — so small businesses always know what happens next.
            </p>
            <div className={s.soon}>
              <span className={s.soonIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="m2.5 4.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <span className={s.soonText}>
                Gmail
                <br />
                connection
              </span>
              <span className={s.badge}>Coming soon</span>
            </div>
          </div>

          <nav className={s.links} aria-label="Footer">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#businesses">For businesses</a>
            <a href={TRY_HREF}>Try FollowUpOS</a>
          </nav>
        </div>

        <div className={`container ${s.bottom}`}>
          <div className={s.giant} aria-hidden="true">
            <LogoMark className={s.giantMark} />
            <span className="serif">FollowUpOS</span>
          </div>
          <div className={s.legal}>
            <span>© {new Date().getFullYear()} FollowUpOS</span>
            <span>Product visuals on this page use example data.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
