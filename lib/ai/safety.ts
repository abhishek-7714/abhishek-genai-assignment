/**
 * Deterministic checks applied to every AI draft, independent of the prompt.
 * The prompt asks the model to behave; these checks verify it did.
 */

const MONEY = /(?:₹|rs\.?|inr|\$|£|€)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:\/-|rupees?|rs\b|inr\b|dollars?)/gi;
const PERCENT_OFF = /\d{1,3}\s?%\s?(?:off|discount|chhoot|chhut)/i;
const REFUND_PROMISE =
  /\b(?:we(?:'ll| will)|i(?:'ll| will)|will be|has been|have been|is being)\s+(?:\w+\s+){0,2}(?:refund|refunded|reimburs\w*|compensat\w*)|\b(?:full|complete)\s+refund\b|refund\s+(?:kar\s+denge|ho\s+jayega|mil\s+jayega|de\s+denge)|paise\s+wapas\s+(?:kar\s+denge|mil\s+jayenge|de\s+denge)/i;
const DISCOUNT_PROMISE = /\b(?:free of charge|for free|complimentary|on the house|discount)\b/i;
const NEGATION = /\b(?:not|no|cannot|can't|cant|won't|unable|nahi|nahin|nhi)\b|n't\b/i;

/** True if any sentence makes the promise without negating it ("we can't offer a discount" is fine). */
function promises(reply: string, pattern: RegExp): boolean {
  return reply
    .split(/(?<=[.!?।])\s+|\n+/)
    .some((sentence) => pattern.test(sentence) && !NEGATION.test(sentence));
}

const norm = (n: string) => n.replace(/,/g, "").replace(/\.0+$/, "");

function amounts(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MONEY)) out.push(norm(m[1] ?? m[2]));
  return out;
}

export type SafetyVerdict = { ok: true } | { ok: false; reason: string; correction: string };

export function checkReply(reply: string, facts: string): SafetyVerdict {
  const factNumbers = new Set((facts.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(norm));

  const unsupported = amounts(reply).filter((a) => !factNumbers.has(a));
  if (unsupported.length) {
    return {
      ok: false,
      reason: "Mentions a price that isn’t in your business facts — check before sending.",
      correction:
        "Your previous draft stated a price that is not in <business_facts>. Do not state any price. Say the owner will confirm the price, or ask a clarifying question.",
    };
  }

  const factsLower = facts.toLowerCase();
  const refundAllowed = /refund|money back|return/.test(factsLower);
  if (promises(reply, REFUND_PROMISE) && !refundAllowed) {
    return {
      ok: false,
      reason: "Appears to promise a refund your policies don’t cover — check before sending.",
      correction:
        "Your previous draft promised or implied a refund or compensation. No refund policy is provided. Acknowledge the problem and offer to look into it without promising any outcome.",
    };
  }

  const discountAllowed = /discount|% off|offer|free/.test(factsLower);
  if ((promises(reply, DISCOUNT_PROMISE) || promises(reply, PERCENT_OFF)) && !discountAllowed) {
    return {
      ok: false,
      reason: "Offers a discount or free service that isn’t in your business facts — check before sending.",
      correction: "Your previous draft offered a discount or free service. None is allowed by <business_facts>. Remove it.",
    };
  }
  return { ok: true };
}
