import { z } from "zod";

/** Shared, client-safe vocabulary for FollowUpOS signals. */

export const BUSINESS_TYPES = ["salon", "home_bakery", "photographer", "tutor", "fitness_trainer", "other"] as const;
export const LANGUAGES = ["english", "hindi", "hinglish", "regional"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const SENTIMENTS = ["positive", "neutral", "concerned", "negative", "urgent"] as const;
export const URGENCIES = ["immediate", "today", "this_week", "no_rush"] as const;
export const REQUEST_TYPES = [
  "appointment_enquiry",
  "price_enquiry",
  "availability_enquiry",
  "purchase_enquiry",
  "order_status",
  "support_issue",
  "complaint",
  "refund_request",
  "general_question",
  "other",
] as const;
export const REPLY_LANGUAGES = ["english", "hindi", "hinglish", "regional", "other"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Sentiment = (typeof SENTIMENTS)[number];
export type Urgency = (typeof URGENCIES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  salon: "Salon",
  home_bakery: "Home bakery",
  photographer: "Photographer",
  tutor: "Tutor",
  fitness_trainer: "Fitness trainer",
  other: "Other",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  english: "English",
  hindi: "Hindi",
  hinglish: "Hinglish",
  regional: "Regional language",
  other: "Other",
};

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  appointment_enquiry: "Appointment enquiry",
  price_enquiry: "Price enquiry",
  availability_enquiry: "Availability enquiry",
  purchase_enquiry: "Purchase enquiry",
  order_status: "Order status",
  support_issue: "Support issue",
  complaint: "Complaint",
  refund_request: "Refund request",
  general_question: "General question",
  other: "Other",
};

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  concerned: "Concerned",
  negative: "Negative",
  urgent: "Urgent",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  immediate: "Reply now",
  today: "Reply today",
  this_week: "This week",
  no_rush: "No rush",
};

/** One recommended next step — a single imperative, never a list. */
const singleAction = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .refine((s) => !/\n|^\s*([-*•]|\d+[.)])\s/.test(s), "next action must be a single step");

export const analysisSchema = z.object({
  intent: z.string().trim().min(2).max(80),
  requestType: z.enum(REQUEST_TYPES),
  priority: z.enum(PRIORITIES),
  sentiment: z.enum(SENTIMENTS),
  urgency: z.enum(URGENCIES),
  blocker: z.string().trim().min(2).max(120),
  suggestedReply: z.string().trim().min(2).max(900),
  nextAction: singleAction,
  replyLanguage: z.enum(REPLY_LANGUAGES),
});

export type Analysis = z.infer<typeof analysisSchema>;

export type AnalysisResult = Analysis & {
  needsReview: boolean;
  reviewReason: string | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};
