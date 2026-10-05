import type { BusinessType, Language, Priority, RequestType, Sentiment, Urgency } from "@/lib/ai/types";

export type ConversationState = "new" | "needs_attention" | "waiting_customer" | "resolved";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  business_type: BusinessType;
  language: Language;
  facts: string;
  created_at: string;
  updated_at: string;
};

export type ConversationAnalysis = {
  id: string;
  conversation_id: string;
  intent: string;
  request_type: RequestType;
  priority: Priority;
  sentiment: Sentiment;
  urgency: Urgency;
  blocker: string;
  suggested_reply: string;
  next_action: string;
  reply_language: string;
  needs_review: boolean;
  review_reason: string | null;
  is_demo: boolean;
  model: string;
  created_at: string;
};

export type FollowUp = {
  id: string;
  conversation_id: string;
  action: string;
  due_at: string;
  status: "open" | "done" | "cancelled";
  completed_at: string | null;
  snooze_count: number;
  created_at: string;
};

export type Conversation = {
  id: string;
  business_id: string;
  source: "gmail" | "demo";
  gmail_thread_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_direction: "inbound" | "outbound" | null;
  state: ConversationState;
  priority_override: Priority | null;
  analysis_dismissed: boolean;
  needs_analysis: boolean;
  latest_analysis_id: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type ConversationWithSignal = Conversation & {
  analysis: ConversationAnalysis | null;
  follow_up: FollowUp | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  rfc_message_id: string | null;
  from_name: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
  is_demo: boolean;
};

export type GmailConnection = {
  business_id: string;
  email: string;
  status: "connected" | "error";
  last_synced_at: string | null;
  last_sync_error: string | null;
};
