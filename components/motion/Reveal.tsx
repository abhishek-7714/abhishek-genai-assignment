"use client";

import { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "./hooks";

type RevealProps = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "fade" | "scale" | "left" | "right";
  threshold?: number;
  style?: CSSProperties;
  id?: string;
};

/** Fades, lifts and un-blurs its content when it scrolls into view. */
export function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  variant = "up",
  threshold = 0.18,
  style,
  id,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold });
  return (
    <Tag
      ref={ref}
      id={id}
      data-variant={variant}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ ...style, "--delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

type BlurWordsProps = {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Optional manual trigger (e.g. hero intro). Falls back to in-view detection. */
  play?: boolean;
  /** Insert a line break before the word at these indexes (desktop typesetting). */
  breaks?: number[];
};

/** Splits a headline into words that resolve from blur one after another. */
export function BlurWords({ text, as: Tag = "h2", className = "", delay = 0, play, breaks = [] }: BlurWordsProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.3 });
  const active = play ?? inView;
  const words = text.split(" ");
  return (
    <Tag
      ref={ref}
      aria-label={text}
      className={`blur-words ${active ? "is-in" : ""} ${className}`}
      style={{ "--base": `${delay}ms` } as CSSProperties}
    >
      {words.map((word, i) => (
        <span key={i} aria-hidden="true">
          {breaks.includes(i) && <br className="bw-break" />}
          <span className="w" style={{ "--i": i } as CSSProperties}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
