"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LANGUAGE_LABEL, REQUEST_TYPE_LABEL, REQUEST_TYPES, SENTIMENT_LABEL, SENTIMENTS } from "@/lib/ai/types";
import s from "./InboxControls.module.css";

type Props = {
  filters: { key: string; label: string; count: number }[];
  active: string;
  sort: string;
  type?: string;
  sentiment?: string;
  lang?: string;
  languages: string[];
};

export function InboxControls({ filters, active, sort, type, sentiment, lang, languages }: Props) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const set = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && !(key === "filter" && value === "all") && !(key === "sort" && value === "priority")) next.set(key, value);
    else next.delete(key);
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const extra = Boolean(type || sentiment || lang);

  return (
    <div className={s.bar}>
      <div className={s.tabs} role="tablist" aria-label="Filter conversations">
        {filters.map((f) => (
          <button key={f.key} role="tab" aria-selected={active === f.key} className={s.tab} onClick={() => set("filter", f.key)}>
            {f.label}
            <span className={s.count}>{f.count}</span>
          </button>
        ))}
      </div>
      <div className={s.right}>
        <details className={s.more} open={extra || undefined}>
          <summary>Filters{extra ? " ·  on" : ""}</summary>
          <div className={s.selects}>
            <label>
              <span className="sr-only">Request type</span>
              <select className="ui-select" value={type ?? ""} onChange={(e) => set("type", e.target.value)}>
                <option value="">All request types</option>
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {REQUEST_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sentiment</span>
              <select className="ui-select" value={sentiment ?? ""} onChange={(e) => set("sentiment", e.target.value)}>
                <option value="">Any sentiment</option>
                {SENTIMENTS.map((t) => (
                  <option key={t} value={t}>
                    {SENTIMENT_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            {languages.length > 0 && (
              <label>
                <span className="sr-only">Language</span>
                <select className="ui-select" value={lang ?? ""} onChange={(e) => set("lang", e.target.value)}>
                  <option value="">Any language</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {LANGUAGE_LABEL[l] ?? l}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </details>
        <label className={s.sort}>
          <span>Sort</span>
          <select className="ui-select" value={sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
            <option value="due">Follow-up due</option>
          </select>
        </label>
      </div>
    </div>
  );
}
