/**
 * Illustrative data for the landing page product visuals.
 * Nothing here is real customer data or a performance claim.
 */

export type Priority = "high" | "medium" | "low";

export type Conversation = {
  id: string;
  customer: string;
  business: string;
  subject: string;
  preview: string;
  intent: string;
  priority: Priority;
  blocker: string;
  nextAction: string;
  waiting: string;
};

/** Every "Try FollowUpOS" CTA on the landing page opens the analyzer. */
export const TRY_HREF = "/analyze";

export const heroSignal = {
  message: "Hi, are you available Sunday? How much for haircut + beard?",
  customer: "Rahul · new customer",
  intent: "Booking enquiry",
  priority: "high" as Priority,
  blocker: "Availability",
  nextAction: "Ask for preferred appointment time",
  reply:
    "Hi! Thanks for reaching out. Sunday appointments are available depending on the time. What time would you prefer?",
};

export const attentionQueue: Conversation[] = [
  {
    id: "c1",
    customer: "Rahul M.",
    business: "Salon",
    subject: "Sunday haircut + beard",
    preview: "Hi, are you available Sunday? How much for haircut + beard?",
    intent: "Booking enquiry",
    priority: "high",
    blocker: "Availability",
    nextAction: "Ask for preferred time",
    waiting: "12m",
  },
  {
    id: "c2",
    customer: "Ananya & Dev",
    business: "Photographer",
    subject: "Wedding photography enquiry",
    preview: "Are you free for a wedding on the 24th? It's in Jaipur.",
    intent: "Availability enquiry",
    priority: "high",
    blocker: "Date not confirmed",
    nextAction: "Confirm date",
    waiting: "1h",
  },
  {
    id: "c3",
    customer: "Meera K.",
    business: "Tutor",
    subject: "Trial class enquiry",
    preview: "Can we schedule a trial class this weekend for my son?",
    intent: "Scheduling enquiry",
    priority: "medium",
    blocker: "Scheduling",
    nextAction: "Suggest available slots",
    waiting: "3h",
  },
  {
    id: "c4",
    customer: "Priya S.",
    business: "Home bakery",
    subject: "2kg chocolate cake",
    preview: "Can you make a 2kg chocolate cake for Saturday?",
    intent: "Purchase enquiry",
    priority: "high",
    blocker: "Price not shared",
    nextAction: "Send price + flavours",
    waiting: "26m",
  },
];

export const useCases = [
  {
    id: "salon",
    label: "Salons & barbers",
    message: "Hi bhai, Sunday ko haircut + beard ke liye slot milega?",
    intent: "Booking enquiry",
    priority: "high" as Priority,
    nextAction: "Offer two Sunday slots",
    note: "Mixed-language messages are read the way your customers actually write.",
  },
  {
    id: "bakery",
    label: "Home bakeries",
    message: "Can you make a 2kg chocolate cake for Saturday?",
    intent: "Purchase enquiry",
    priority: "high" as Priority,
    nextAction: "Send price and flavour options",
    note: "Orders with a date attached rise to the top before the date slips.",
  },
  {
    id: "photographer",
    label: "Photographers",
    message: "Are you free for a wedding on the 24th?",
    intent: "Availability enquiry",
    priority: "high" as Priority,
    nextAction: "Confirm the date and share packages",
    note: "Date-specific enquiries are flagged while the date is still open.",
  },
  {
    id: "tutor",
    label: "Tutors",
    message: "Can we schedule a trial class this weekend?",
    intent: "Scheduling enquiry",
    priority: "medium" as Priority,
    nextAction: "Suggest available slots",
    note: "Trial requests get a clear next step instead of a long back-and-forth.",
  },
];

export const glance = {
  attention: 12,
  highIntent: 7,
  overdue: 3,
  waiting: 2,
};
