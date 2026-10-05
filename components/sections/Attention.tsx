"use client";

import { BlurWords, Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { LogoMark } from "@/components/Logo";
import { ConversationRow, DemoBadge, NextActionCard, StatusDot, SuggestedReply } from "@/components/product";
import { attentionQueue, glance } from "@/lib/demo";
import s from "./Attention.module.css";

export function Attention() {
  return (
    <section className={s.section}>
      <div className={`container ${s.grid}`}>
        <div className={s.copy}>
          <BlurWords text="Know who needs you first." className={`display ${s.title}`} breaks={[3]} />
          <Reveal as="p" className="lede" delay={400}>
            Every conversation ranked by intent and urgency, with the reason and the next step written
            beside it. Open FollowUpOS and start at the top.
          </Reveal>
          <Reveal delay={550}>
            <a href="#how" className="btn btn-outline">
              See how it works
            </a>
          </Reveal>
        </div>

        <div className={s.visual}>
          <Reveal variant="scale" className={s.stage}>
            <div className={s.stageBg} aria-hidden="true" />
            <div className={s.app} role="img" aria-label="Example FollowUpOS inbox showing conversations that need attention">
              <div className={s.appBar}>
                <span className={s.appBrand}>
                  <LogoMark size={16} /> FOLLOWUPOS
                </span>
                <StatusDot status="live">Example inbox</StatusDot>
              </div>
              <div className={s.appHead}>
                <h3 className="serif">Needs attention</h3>
                <span className={s.count}>
                  <CountUp to={glance.attention} /> conversations
                </span>
              </div>
              <div className={s.tabs} aria-hidden="true">
                <span data-on>All</span>
                <span>
                  High intent <b>{glance.highIntent}</b>
                </span>
                <span>
                  Overdue <b>{glance.overdue}</b>
                </span>
                <span>
                  Waiting <b>{glance.waiting}</b>
                </span>
              </div>
              <div className={s.rows}>
                {attentionQueue.slice(0, 3).map((c, i) => (
                  <Reveal key={c.id} delay={400 + i * 160} variant="right">
                    <ConversationRow conversation={c} active={i === 0} />
                  </Reveal>
                ))}
              </div>
            </div>
            <div className={s.badge}>
              <DemoBadge />
            </div>
          </Reveal>

          <div className={s.thumbs}>
            <Reveal className={s.thumb} delay={100}>
              <span className={s.num}>02</span>
              <span className={s.thumbLabel}>Wedding · 24th</span>
              <NextActionCard action="Confirm the date and share packages" />
            </Reveal>
            <Reveal className={s.thumb} delay={220}>
              <span className={s.num}>03</span>
              <span className={s.thumbLabel}>Trial class</span>
              <div className={s.miniReply}>
                <SuggestedReply text="Happy to! Saturday 10am or Sunday 5pm?" actions={false} />
              </div>
            </Reveal>
            <Reveal className={s.thumb} delay={340}>
              <span className={s.num}>04</span>
              <span className={s.thumbLabel}>Follow-ups</span>
              <div className={s.overdue}>
                <span className="serif">{glance.overdue}</span>
                <StatusDot status="overdue">overdue today</StatusDot>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
