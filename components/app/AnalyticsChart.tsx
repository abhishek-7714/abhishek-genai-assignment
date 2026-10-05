"use client";

import { useId } from "react";
import s from "./AnalyticsChart.module.css";

type Row = { key: string; label: string; count: number };

/**
 * Single-series magnitude by category → horizontal bars in one hue.
 * Labels and values use text colours; each bar has a hover/focus tooltip;
 * a table view is always available.
 */
export function AnalyticsChart({ title, rows, unit = "conversations" }: { title: string; rows: Row[]; unit?: string }) {
  const id = useId();
  const total = rows.reduce((a, r) => a + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const shown = rows.slice(0, 7);
  const other = rows.slice(7).reduce((a, r) => a + r.count, 0);
  const display = other ? [...shown, { key: "other", label: "Other", count: other }] : shown;

  return (
    <figure className={s.figure} aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className={s.title}>
        {title}
      </figcaption>
      <ul className={s.bars}>
        {display.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.key} className={s.row} tabIndex={0} aria-label={`${r.label}: ${r.count} ${unit}, ${pct}%`}>
              <span className={s.label}>{r.label}</span>
              <span className={s.track}>
                <span className={s.bar} style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className={s.value}>{r.count}</span>
              <span className={s.tip} aria-hidden="true">
                <strong>{r.label}</strong>
                {r.count} {unit} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
      <details className={s.table}>
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Count</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td>{r.count}</td>
                <td>{total ? Math.round((r.count / total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
