/**
 * Integration test for the Gmail pipeline against the local Supabase stack.
 * Google's HTTP endpoints are stubbed; everything else (encryption, upserts,
 * state transitions, MIME building) is the real code.
 *
 * Run: npm run test:gmail   (requires `npm run db:start`)
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

process.env.GOOGLE_CLIENT_ID ||= "test-client";
process.env.GOOGLE_CLIENT_SECRET ||= "test-secret";
process.env.GOOGLE_REDIRECT_URI ||= "http://localhost:3001/auth/gmail/callback";

const OWN = "owner@salon.test";
const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

type Msg = { id: string; threadId: string; internalDate: string; labelIds?: string[]; payload: unknown };
const threads = new Map<string, Msg[]>();
let sentRaw: { raw: string; threadId?: string } | null = null;
let refreshCalls = 0;
let tokenExpiresIn = 3600;

function message(id: string, threadId: string, from: string, body: string, at: number, extra: Record<string, string> = {}): Msg {
  return {
    id,
    threadId,
    internalDate: String(at),
    labelIds: from.includes(OWN) ? ["SENT"] : ["INBOX"],
    payload: {
      mimeType: "multipart/alternative",
      headers: [
        { name: "From", value: from },
        { name: "To", value: from.includes(OWN) ? "rahul@customer.test" : OWN },
        { name: "Subject", value: "Sunday haircut" },
        { name: "Message-ID", value: `<${id}@mail.test>` },
        ...Object.entries(extra).map(([name, value]) => ({ name, value })),
      ],
      parts: [
        { mimeType: "text/plain", body: { data: b64url(body) } },
        { mimeType: "text/html", body: { data: b64url(`<p>${body}</p>`) } },
      ],
    },
  };
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const params = new URLSearchParams(String(init?.body));
    if (params.get("grant_type") === "refresh_token") refreshCalls++;
    return json({
      access_token: `access-${Date.now()}`,
      refresh_token: params.get("grant_type") === "authorization_code" ? "refresh-SECRET-123" : undefined,
      expires_in: tokenExpiresIn,
      scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    });
  }
  if (url.startsWith("https://oauth2.googleapis.com/revoke")) return json({});
  if (url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/profile")) return json({ emailAddress: OWN });
  if (url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/threads?")) return json({ threads: [...threads.keys()].map((id) => ({ id })) });
  const t = url.match(/threads\/([^?]+)\?format=full/);
  if (t) return json({ id: t[1], messages: threads.get(t[1]) ?? [] });
  if (url.endsWith("/messages/send")) {
    sentRaw = JSON.parse(String(init?.body));
    return json({ id: "sent-1", threadId: sentRaw?.threadId });
  }
  return realFetch(input, init);
}) as typeof fetch;

let admin: import("@supabase/supabase-js").SupabaseClient;
let business: import("../lib/types").Business;
let userId: string;
let gmail: typeof import("../lib/server/gmail");

before(async () => {
  const { supabaseAdmin } = await import("../lib/supabase/server");
  gmail = await import("../lib/server/gmail");
  admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email: `gmail-test-${Date.now()}@test.dev`, password: "password123", email_confirm: true });
  assert.ifError(error);
  userId = data.user!.id;
  const biz = await admin.from("businesses").insert({ owner_id: userId, name: "Test Salon", business_type: "salon" }).select("*").single();
  assert.ifError(biz.error);
  business = biz.data;
});

after(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
  globalThis.fetch = realFetch;
});

test("connect stores encrypted credentials and the account address", async () => {
  await gmail.connectGmail(business, "auth-code");
  const cred = await admin.from("gmail_credentials").select("*").eq("business_id", business.id).single();
  assert.ok(cred.data.refresh_token_enc.startsWith("v1."));
  assert.ok(!cred.data.refresh_token_enc.includes("refresh-SECRET-123"), "refresh token must be encrypted at rest");
  const conn = await admin.from("gmail_connections").select("*").eq("business_id", business.id).single();
  assert.equal(conn.data.email, OWN);
});

test("sync imports customer threads, skips automated and owner-only threads, strips quoted text", async () => {
  const t0 = Date.now() - 3_600_000;
  threads.set("t-customer", [
    message("m1", "t-customer", "Rahul <rahul@customer.test>", "Hi, are you available Sunday?\n\nOn Mon, Oct 5, 2026 at 9:00 AM Salon wrote:\n> old quoted text", t0),
  ]);
  threads.set("t-newsletter", [message("m2", "t-newsletter", "Deals <no-reply@shop.test>", "50% off everything", t0)]);
  threads.set("t-owner", [message("m3", "t-owner", `Salon <${OWN}>`, "Note to self", t0)]);

  const first = await gmail.syncInbox(admin, business);
  assert.equal(first.imported, 1);

  const convs = await admin.from("conversations").select("*").eq("business_id", business.id);
  assert.equal(convs.data!.length, 1);
  assert.equal(convs.data![0].customer_email, "rahul@customer.test");
  assert.equal(convs.data![0].state, "new");
  assert.equal(convs.data![0].needs_analysis, true);

  const msgs = await admin.from("messages").select("body").eq("business_id", business.id);
  assert.equal(msgs.data![0].body, "Hi, are you available Sunday?");
});

test("running sync twice creates no duplicates", async () => {
  const again = await gmail.syncInbox(admin, business);
  assert.equal(again.imported, 0);
  const convs = await admin.from("conversations").select("id").eq("business_id", business.id);
  const msgs = await admin.from("messages").select("id").eq("business_id", business.id);
  assert.equal(convs.data!.length, 1);
  assert.equal(msgs.data!.length, 1);
});

test("a new customer reply reopens a resolved conversation", async () => {
  await admin.from("conversations").update({ state: "resolved", needs_analysis: false }).eq("business_id", business.id);
  threads.get("t-customer")!.push(message("m4", "t-customer", "Rahul <rahul@customer.test>", "Actually, is 5pm free?", Date.now() - 60_000));
  await gmail.syncInbox(admin, business);
  const conv = await admin.from("conversations").select("*").eq("business_id", business.id).single();
  assert.equal(conv.data.state, "needs_attention");
  assert.equal(conv.data.needs_analysis, true);
  assert.equal(conv.data.last_message_preview, "Actually, is 5pm free?");
  const msgs = await admin.from("messages").select("id").eq("business_id", business.id);
  assert.equal(msgs.data!.length, 2);
});

test("send builds a threaded, UTF-8 reply to the stored customer only", async () => {
  const conv = await admin.from("conversations").select("*").eq("business_id", business.id).single();
  await gmail.sendReply(business, conv.data, "<m4@mail.test>", "Haan, 5 baje free hai. ₹500 for haircut + beard.");
  assert.ok(sentRaw);
  assert.equal(sentRaw!.threadId, "t-customer");
  const mime = Buffer.from(sentRaw!.raw, "base64url").toString("utf8");
  assert.match(mime, /^To: rahul@customer\.test$/m);
  assert.match(mime, /^In-Reply-To: <m4@mail\.test>$/m);
  assert.match(mime, /^Subject: Re: Sunday haircut$/m);
  const body = mime.split("\r\n\r\n")[1].replace(/\r\n/g, "");
  assert.equal(Buffer.from(body, "base64").toString("utf8"), "Haan, 5 baje free hai. ₹500 for haircut + beard.");
});

test("header injection in subject is neutralised", async () => {
  await gmail.sendReply(business, { gmail_thread_id: "t-customer", customer_email: "rahul@customer.test", subject: "Hi\r\nBcc: attacker@evil.test" }, null, "x");
  const mime = Buffer.from(sentRaw!.raw, "base64url").toString("utf8");
  assert.doesNotMatch(mime, /^Bcc:/m);
});

test("expired access token is refreshed server-side", async () => {
  await admin.from("gmail_credentials").update({ access_token_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("business_id", business.id);
  const before = refreshCalls;
  await gmail.syncInbox(admin, business);
  assert.equal(refreshCalls, before + 1);
});

test("disconnect deletes credentials and connection but keeps conversations", async () => {
  await gmail.disconnectGmail(business);
  const cred = await admin.from("gmail_credentials").select("business_id").eq("business_id", business.id);
  const conn = await admin.from("gmail_connections").select("business_id").eq("business_id", business.id);
  const convs = await admin.from("conversations").select("id").eq("business_id", business.id);
  assert.equal(cred.data!.length, 0);
  assert.equal(conn.data!.length, 0);
  assert.equal(convs.data!.length, 1);
});
