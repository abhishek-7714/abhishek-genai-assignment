import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/server/env";
import { errMessage, log } from "@/lib/server/log";
import { buildUserPrompt, PromptMessage, RedraftStyle, SYSTEM_PROMPT } from "./prompt";
import { checkReply, detectInjection, INJECTION_REASON } from "./safety";
import { analysisSchema, AnalysisResult, PRIORITIES, REPLY_LANGUAGES, REQUEST_TYPES, SENTIMENTS, URGENCIES } from "./types";

/**
 * Compact keys keep the JSON small so a full analysis fits the 200-token
 * output budget required for the public analyzer.
 */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", description: "Short label for what the customer wants" },
    type: { type: "string", enum: [...REQUEST_TYPES] },
    priority: { type: "string", enum: [...PRIORITIES] },
    sentiment: { type: "string", enum: [...SENTIMENTS] },
    urgency: { type: "string", enum: [...URGENCIES] },
    blocker: { type: "string", description: "The one thing stopping the customer, or None" },
    reply: { type: "string", description: "Concise draft reply in the customer's language" },
    next: { type: "string", description: "Exactly one next action for the owner, one imperative sentence" },
    lang: { type: "string", enum: [...REPLY_LANGUAGES] },
  },
  required: ["intent", "type", "priority", "sentiment", "urgency", "blocker", "reply", "next", "lang"],
} as const;

export type AnalyzeInput = {
  businessType: string;
  preferredLanguage: string;
  facts: string;
  messages: PromptMessage[];
  /** Hard cap on Gemini output tokens. The public analyzer uses 200. */
  maxOutputTokens: number;
  style?: RedraftStyle;
};

const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 45_000;

let client: GoogleGenAI | null = null;
const gemini = () => (client ??= new GoogleGenAI({ apiKey: env.geminiKey() }));

const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Request = Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">;

/**
 * Calls the primary model, retrying temporary capacity errors (429/5xx) with backoff,
 * then falls through to the fallback models. Anything else (bad key, bad request) fails fast.
 */
async function generate(request: Request) {
  const models = [env.geminiModel(), ...env.geminiFallbackModels()];
  let lastError: unknown;
  for (const [index, model] of models.entries()) {
    const delays = index === 0 ? [800, 2000] : [800];
    for (let i = 0; ; i++) {
      try {
        const res = await gemini().models.generateContent({ ...request, model });
        return { res, model };
      } catch (e) {
        lastError = e;
        const status = e instanceof ApiError ? e.status : undefined;
        if (!status || !TRANSIENT.has(status)) throw e;
        log("ai.request_failed", { model, status, retry: i + 1 });
        if (i >= delays.length) break; // move on to the next model
        await sleep(delays[i] + Math.random() * 300);
      }
    }
  }
  throw lastError;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new AppError("ai_unavailable", "timeout")), TIMEOUT_MS)),
  ]);
}

/**
 * The one analysis pipeline used by the manual analyzer, Gmail conversations
 * and re-drafts. Returns validated, safety-checked output plus token usage.
 */
export async function analyzeConversation(input: AnalyzeInput): Promise<AnalysisResult> {
  const customerText = input.messages.filter((m) => m.role === "customer").map((m) => m.text.trim()).join("");
  if (!customerText) throw new AppError("empty_message");

  let model = env.geminiModel();
  let inputTokens = 0;
  let outputTokens = 0;
  let correction: string | undefined;
  let lastReason: string | null = null;

  // Detected independently of the model, so the owner is always told — even when the model behaves.
  const injection = detectInjection(input.messages.filter((m) => m.role === "customer").map((m) => m.text).join("\n"));
  if (injection) log("ai.injection_detected", { pattern: injection });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text: string | undefined;
    let finish: string | undefined;
    try {
      const out = await withTimeout(
        generate({
          contents: buildUserPrompt({ ...input, correction, suspicious: Boolean(injection) }),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: RESPONSE_SCHEMA,
            maxOutputTokens: input.maxOutputTokens,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      );
      const res = out.res;
      model = out.model;
      inputTokens += res.usageMetadata?.promptTokenCount ?? 0;
      outputTokens += (res.usageMetadata?.candidatesTokenCount ?? 0) + (res.usageMetadata?.thoughtsTokenCount ?? 0);
      text = res.text;
      finish = res.candidates?.[0]?.finishReason;
    } catch (e) {
      if (e instanceof AppError) throw e;
      const status = e instanceof ApiError ? e.status : undefined;
      log("ai.request_failed", { model, status, attempt, message: errMessage(e) });
      throw new AppError("ai_unavailable", errMessage(e));
    }

    let raw: Record<string, unknown> | null = null;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = null;
    }
    const parsed = raw
      ? analysisSchema.safeParse({
          intent: raw.intent,
          requestType: raw.type,
          priority: raw.priority,
          sentiment: raw.sentiment,
          urgency: raw.urgency,
          blocker: raw.blocker,
          suggestedReply: raw.reply,
          nextAction: raw.next,
          replyLanguage: raw.lang,
        })
      : null;

    if (!parsed?.success) {
      log("ai.malformed_output", {
        model,
        attempt,
        finish,
        // Field names and error codes only — never the content.
        issues: parsed ? parsed.error.issues.map((i) => `${i.path.join(".")}:${i.code}`).join(",") : raw ? "not-json-schema" : "unparseable",
      });
      correction =
        finish === "MAX_TOKENS"
          ? "Your previous answer was cut off. Keep the reply under 35 words and every other field very short."
          : "Your previous answer did not match the schema. Return exactly one JSON object with every field.";
      if (attempt === MAX_ATTEMPTS) throw new AppError("ai_malformed", `finish=${finish}`);
      continue;
    }

    const verdict = checkReply(parsed.data.suggestedReply, input.facts);
    if (!verdict.ok) {
      log("ai.safety_flag", { model, attempt, reason: verdict.reason });
      lastReason = verdict.reason;
      if (attempt < MAX_ATTEMPTS) {
        correction = verdict.correction;
        continue;
      }
    }

    return {
      ...parsed.data,
      needsReview: !verdict.ok || Boolean(injection),
      reviewReason: [verdict.ok ? null : lastReason, injection ? INJECTION_REASON : null].filter(Boolean).join(" ") || null,
      model,
      inputTokens: inputTokens || null,
      outputTokens: outputTokens || null,
    };
  }
  throw new AppError("ai_malformed");
}
