import "server-only";
import type { Business } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbOk } from "./api";

const min = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const inMin = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

type DemoMessage = { dir: "inbound" | "outbound"; body: string; ago: number };
type DemoConversation = {
  name: string;
  email: string;
  subject: string;
  state: "needs_attention" | "waiting_customer" | "resolved";
  messages: DemoMessage[];
  analysis: {
    intent: string;
    request_type: string;
    priority: "high" | "medium" | "low";
    sentiment: "positive" | "neutral" | "concerned" | "negative" | "urgent";
    urgency: "immediate" | "today" | "this_week" | "no_rush";
    blocker: string;
    suggested_reply: string;
    next_action: string;
    reply_language: string;
  };
  followUp?: { action: string; dueIn: number };
};

/** Sample conversations from different kinds of small businesses. Clearly marked as demo everywhere. */
const DEMO: DemoConversation[] = [
  {
    name: "Rahul Mehta",
    email: "rahul.mehta@example.com",
    subject: "Sunday haircut + beard",
    state: "needs_attention",
    messages: [{ dir: "inbound", body: "Hi, are you available Sunday for haircut + beard? How much would it be?", ago: 24 }],
    analysis: {
      intent: "Booking enquiry",
      request_type: "appointment_enquiry",
      priority: "high",
      sentiment: "neutral",
      urgency: "today",
      blocker: "Availability",
      suggested_reply: "Hi Rahul! Thanks for reaching out. Sunday appointments are available depending on the time. What time would you prefer?",
      next_action: "Ask for preferred appointment time",
      reply_language: "english",
    },
  },
  {
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    subject: "Wedding on the 24th",
    state: "needs_attention",
    messages: [{ dir: "inbound", body: "Are you available for a wedding on the 24th? It's in Jaipur, around 200 guests. We'd love to see your packages.", ago: 130 }],
    analysis: {
      intent: "Photography enquiry",
      request_type: "availability_enquiry",
      priority: "high",
      sentiment: "positive",
      urgency: "today",
      blocker: "Date not confirmed",
      suggested_reply: "Hi Ananya, congratulations! Let me check the 24th and get back to you today. Could you share the event timings so I can suggest the right package?",
      next_action: "Confirm date and package requirements",
      reply_language: "english",
    },
  },
  {
    name: "Vikram Rao",
    email: "vikram.rao@example.com",
    subject: "Late order again",
    state: "needs_attention",
    messages: [{ dir: "inbound", body: "This is the second time my order came late. Very disappointed. I want a refund.", ago: 55 }],
    analysis: {
      intent: "Complaint about late delivery",
      request_type: "complaint",
      priority: "high",
      sentiment: "negative",
      urgency: "immediate",
      blocker: "Unresolved complaint",
      suggested_reply: "Hi Vikram, I'm really sorry your order was late again. Could you share your order date so I can look into what happened?",
      next_action: "Apologise and ask for the order details",
      reply_language: "english",
    },
  },
  {
    name: "Priya Singh",
    email: "priya.singh@example.com",
    subject: "2kg chocolate cake for Saturday",
    state: "waiting_customer",
    messages: [
      { dir: "inbound", body: "Can you make a 2kg chocolate cake for Saturday? It's for my daughter's birthday.", ago: 60 * 28 },
      { dir: "outbound", body: "Yes, we can! Would you like chocolate truffle or chocolate fudge? I'll confirm the price once you choose.", ago: 60 * 27 },
    ],
    analysis: {
      intent: "Cake order",
      request_type: "purchase_enquiry",
      priority: "high",
      sentiment: "positive",
      urgency: "this_week",
      blocker: "Flavour not chosen",
      suggested_reply: "Hi Priya, just checking in — have you decided on the flavour? Once you confirm, I'll lock in Saturday for you.",
      next_action: "Check whether Priya has chosen a flavour",
      reply_language: "english",
    },
    followUp: { action: "Check whether Priya has chosen a flavour", dueIn: -180 },
  },
  {
    name: "Meera Kapoor",
    email: "meera.kapoor@example.com",
    subject: "Trial class this weekend",
    state: "waiting_customer",
    messages: [
      { dir: "inbound", body: "Can we schedule a trial class this weekend for my son? He's in class 8.", ago: 60 * 6 },
      { dir: "outbound", body: "Happy to! I have Saturday 10am or Sunday 5pm. Which works better?", ago: 60 * 5 },
    ],
    analysis: {
      intent: "Trial class request",
      request_type: "appointment_enquiry",
      priority: "medium",
      sentiment: "neutral",
      urgency: "this_week",
      blocker: "Slot not confirmed",
      suggested_reply: "Hi Meera, just following up — would Saturday 10am or Sunday 5pm work for the trial class?",
      next_action: "Confirm which trial slot Meera prefers",
      reply_language: "english",
    },
    followUp: { action: "Confirm which trial slot Meera prefers", dueIn: 150 },
  },
  {
    name: "Sameer Khan",
    email: "sameer.khan@example.com",
    subject: "Slot milega?",
    state: "needs_attention",
    messages: [{ dir: "inbound", body: "Bhai Sunday ko haircut ke liye slot milega kya? Shaam ko aa sakta hoon.", ago: 300 }],
    analysis: {
      intent: "Booking enquiry",
      request_type: "appointment_enquiry",
      priority: "medium",
      sentiment: "positive",
      urgency: "today",
      blocker: "Exact time not fixed",
      suggested_reply: "Haan bhai, Sunday shaam ko slot mil jayega. Kitne baje aana chahoge?",
      next_action: "Ask what time on Sunday evening suits him",
      reply_language: "hinglish",
    },
  },
  {
    name: "Arjun Nair",
    email: "arjun.nair@example.com",
    subject: "Thanks!",
    state: "resolved",
    messages: [
      { dir: "inbound", body: "Can I book a portrait session next Friday at 4?", ago: 60 * 50 },
      { dir: "outbound", body: "Done — you're booked for Friday at 4pm. See you then!", ago: 60 * 49 },
      { dir: "inbound", body: "Thanks!", ago: 60 * 48 },
    ],
    analysis: {
      intent: "Booking confirmed",
      request_type: "appointment_enquiry",
      priority: "low",
      sentiment: "positive",
      urgency: "no_rush",
      blocker: "None",
      suggested_reply: "You're welcome, Arjun! See you on Friday.",
      next_action: "No action needed",
      reply_language: "english",
    },
  },
];

export async function loadDemo(business: Business) {
  const admin = supabaseAdmin();
  await clearDemo(business);

  for (const d of DEMO) {
    const last = d.messages[d.messages.length - 1];
    const conv = dbOk(
      await admin
        .from("conversations")
        .insert({
          business_id: business.id,
          source: "demo",
          customer_name: d.name,
          customer_email: d.email,
          subject: d.subject,
          last_message_at: min(last.ago),
          last_message_preview: last.body.slice(0, 200),
          last_direction: last.dir,
          state: d.state,
          needs_analysis: false,
          is_demo: true,
        })
        .select("id")
        .single(),
    ) as { id: string };

    dbOk(
      await admin.from("messages").insert(
        d.messages.map((m) => ({
          conversation_id: conv.id,
          business_id: business.id,
          direction: m.dir,
          from_name: m.dir === "inbound" ? d.name : business.name,
          from_email: m.dir === "inbound" ? d.email : null,
          to_email: m.dir === "inbound" ? null : d.email,
          subject: d.subject,
          body: m.body,
          sent_at: min(m.ago),
          is_demo: true,
        })),
      ),
    );

    const analysis = dbOk(
      await admin
        .from("conversation_analyses")
        .insert({ ...d.analysis, conversation_id: conv.id, business_id: business.id, is_demo: true, model: "demo-sample", created_at: min(last.ago - 1) })
        .select("id")
        .single(),
    ) as { id: string };

    dbOk(await admin.from("conversations").update({ latest_analysis_id: analysis.id }).eq("id", conv.id));

    if (d.followUp) {
      dbOk(
        await admin.from("follow_ups").insert({
          conversation_id: conv.id,
          business_id: business.id,
          action: d.followUp.action,
          due_at: inMin(d.followUp.dueIn),
        }),
      );
    }
  }
}

export async function clearDemo(business: Business) {
  dbOk(await supabaseAdmin().from("conversations").delete().eq("business_id", business.id).eq("is_demo", true));
}
