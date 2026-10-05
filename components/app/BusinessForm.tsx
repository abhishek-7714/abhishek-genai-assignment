"use client";

import { FormEvent, useState } from "react";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES, BusinessType, Language, LANGUAGE_LABEL, LANGUAGES } from "@/lib/ai/types";
import { api, Banner, ErrorBanner, Spinner } from "./Status";
import s from "./BusinessForm.module.css";

const TEMPLATES: Record<BusinessType, string> = {
  salon: "Services:\nHaircut\nHaircut + beard\nHair colouring\n\nPricing:\nHaircut + beard — ₹\n\nOpening hours:\n10 AM – 8 PM\n\nBooking rules:\nAppointments required on Sundays.",
  home_bakery: "Products:\nCustom cakes\nCupcakes\n\nPricing:\n1kg chocolate cake — ₹\n\nOrders:\nOrder at least 2 days in advance.\n\nDelivery:\n",
  photographer: "Services:\nWedding photography\nPortraits\n\nPackages:\n\nAvailability:\nConfirm dates before quoting.\n\nTravel:\n",
  tutor: "Subjects:\n\nClass format:\nOnline / in person\n\nFees:\n\nTrial class:\n",
  fitness_trainer: "Sessions:\nPersonal training\nGroup classes\n\nFees:\n\nTimings:\n",
  other: "Services:\n\nPricing:\n\nOpening hours:\n\nPolicies:\n",
};

type Initial = { name: string; businessType: BusinessType; language: Language; facts: string };

/** Shared by onboarding (create) and Settings (update). */
export function BusinessForm({ mode, initial, onDone }: { mode: "create" | "update"; initial?: Initial; onDone?: () => void }) {
  const [type, setType] = useState<BusinessType>(initial?.businessType ?? "salon");
  const [facts, setFacts] = useState(initial?.facts ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Parameters<typeof ErrorBanner>[0]["error"]>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await api(`/api/business`, {
      method: mode === "create" ? "POST" : "PATCH",
      json: { name: f.get("name"), businessType: type, language: f.get("language"), facts },
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    onDone?.();
  }

  return (
    <form className="ui-form" onSubmit={submit}>
      <ErrorBanner error={error} />
      <div className="ui-field">
        <label htmlFor="biz-name">Business name</label>
        <input id="biz-name" name="name" required maxLength={120} defaultValue={initial?.name} className="ui-input" placeholder="e.g. Sharp Cuts Salon" />
      </div>

      <fieldset className="ui-choices">
        <legend className="ui-legend">What kind of business is it?</legend>
        {BUSINESS_TYPES.map((t) => (
          <label key={t} className="ui-choice">
            <input type="radio" name="businessType" value={t} checked={type === t} onChange={() => setType(t)} />
            <span>{BUSINESS_TYPE_LABEL[t]}</span>
          </label>
        ))}
      </fieldset>

      <div className="ui-field">
        <label htmlFor="biz-lang">Language your customers usually write in</label>
        <select id="biz-lang" name="language" className="ui-select" defaultValue={initial?.language ?? "english"}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABEL[l]}
            </option>
          ))}
        </select>
        <span className="ui-hint">Replies follow the customer’s own language. This is the fallback when it’s unclear.</span>
      </div>

      <div className="ui-field">
        <div className={s.factsHead}>
          <label htmlFor="biz-facts">
            Business facts <span className="ui-muted">(optional, but important)</span>
          </label>
          {!facts.trim() && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setFacts(TEMPLATES[type])}>
              Use a template
            </button>
          )}
        </div>
        <textarea
          id="biz-facts"
          name="facts"
          className={`ui-textarea ${s.facts}`}
          value={facts}
          maxLength={4000}
          onChange={(e) => setFacts(e.target.value)}
          placeholder={"Services, prices, opening hours, booking and refund policies…"}
          aria-describedby="facts-help"
        />
        <div id="facts-help" className={s.help}>
          <strong>FollowUpOS only quotes what’s written here.</strong> If a price, time or policy isn’t in your facts,
          drafts will say you’ll confirm — they will never make one up.
        </div>
      </div>

      {saved && mode === "update" && <Banner title="Saved">New drafts will use these details.</Banner>}

      <button className="btn btn-dark" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? <Spinner label="Saving…" /> : mode === "create" ? "Open my workspace" : "Save business details"}
      </button>
    </form>
  );
}
