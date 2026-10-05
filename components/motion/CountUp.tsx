"use client";

import { useEffect, useState } from "react";
import { useInView } from "./hooks";

type CountUpProps = {
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
};

/** Counts from 0 to `to` once visible — mirrors the animated figures in the reference. */
export function CountUp({ to, duration = 1400, delay = 0, className }: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * to));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [inView, to, duration, delay]);

  return (
    <span ref={ref} className={className} aria-label={String(to)}>
      {value}
    </span>
  );
}
