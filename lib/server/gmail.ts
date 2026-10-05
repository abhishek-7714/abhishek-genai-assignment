import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Business, Conversation } from "@/lib/types";
import { dbOk } from "./api";
import { decrypt, encrypt } from "./crypto";
import { env } from "./env";
import { errMessage, log } from "./log";

/** Only what FollowUpOS needs: read customer threads, send approved replies. */
export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"];

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

/* OAuth ---------------------------------------------------------------- */

export function authUrl(state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", env.googleClientId());
  u.searchParams.set("redirect_uri", env.googleRedirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.googleClientId(), client_secret: env.googleClientSecret(), ...params }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string };
  if (!res.ok || !body.access_token) {
    // Log the OAuth error code only — never token values.
    throw new AppError("gmail_auth_failed", `token ${res.status} ${body.error ?? ""}`);
  }
  return body;
}

/** Exchange the OAuth code, verify scopes, and store encrypted credentials. */
export async function connectGmail(business: Business, code: string) {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: env.googleRedirectUri() });
  const granted = (tokens.scope ?? "").split(" ");
  if (!GMAIL_SCOPES.every((s) => granted.includes(s))) throw new AppError("gmail_auth_failed", "missing scopes");
  if (!tokens.refresh_token) throw new AppError("gmail_auth_failed", "no refresh token");

  const profile = await fetch(`${API}/profile`, { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  if (!profile.ok) throw new AppError("gmail_auth_failed", `profile ${profile.status}`);
  const { emailAddress } = (await profile.json()) as { emailAddress: string };

  const admin = supabaseAdmin();
  dbOk(
    await admin.from("gmail_credentials").upsert({
      business_id: business.id,
      refresh_token_enc: encrypt(tokens.refresh_token),
      access_token_enc: encrypt(tokens.access_token),
      access_token_expires_at: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  );
  dbOk(
    await admin.from("gmail_connections").upsert({
      business_id: business.id,
      email: emailAddress.toLowerCase(),
      scopes: granted,
      status: "connected",
      last_sync_error: null,
    }),
  );
  return emailAddress;
}

async function accessToken(businessId: string): Promise<string> {
  const admin = supabaseAdmin();
  const cred = dbOk(await admin.from("gmail_credentials").select("*").eq("business_id", businessId).maybeSingle()) as {
    refresh_token_enc: string;
    access_token_enc: string | null;
    access_token_expires_at: string | null;
  } | null;
  if (!cred) throw new AppError("gmail_not_connected");

  if (cred.access_token_enc && cred.access_token_expires_at && new Date(cred.access_token_expires_at).getTime() > Date.now()) {
    return decrypt(cred.access_token_enc);
  }
  try {
    const t = await tokenRequest({ refresh_token: decrypt(cred.refresh_token_enc), grant_type: "refresh_token" });
    await admin
      .from("gmail_credentials")
      .update({
        access_token_enc: encrypt(t.access_token),
        access_token_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);
    return t.access_token;
  } catch (e) {
    log("gmail.token_refresh_failed", { business: businessId, message: errMessage(e) });
    await admin.from("gmail_connections").update({ status: "error", last_sync_error: "Gmail access expired or was revoked" }).eq("business_id", businessId);
    throw new AppError("gmail_auth_failed", "refresh failed");
  }
}

async function gmail<T>(businessId: string, path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken(businessId);
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new AppError("gmail_auth_failed", `api ${res.status}`);
  if (!res.ok) throw new Error(`gmail api ${res.status} ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

export async function disconnectGmail(business: Business) {
  const admin = supabaseAdmin();
  const cred = (await admin.from("gmail_credentials").select("refresh_token_enc").eq("business_id", business.id).maybeSingle()).data;
  if (cred) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(cred.refresh_token_enc))}`, { method: "POST" });
    } catch {
      // Revocation is best-effort; the credentials are deleted regardless.
    }
  }
  dbOk(await admin.from("gmail_credentials").delete().eq("business_id", business.id));
  dbOk(await admin.from("gmail_connections").delete().eq("business_id", business.id));
}

/* Message parsing ------------------------------------------------------ */

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; headers?: { name: string; value: string }[] };
type GmailMessage = { id: string; threadId: string; internalDate: string; labelIds?: string[]; payload: Part };

const b64 = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function findPart(p: Part, mime: string): string | null {
  if (p.mimeType === mime && p.body?.data) return b64(p.body.data);
  for (const child of p.parts ?? []) {
    const found = findPart(child, mime);
    if (found) return found;
  }
  return null;
}

function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/** Keep only the new part of an email: drop quoted history and signatures' reply chains. */
export function stripQuoted(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .{4,200}wrote:\s*$/.test(line.trim()) || /^-{2,}\s*Original Message\s*-{2,}/i.test(line.trim())) break;
    if (/^>/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function header(p: Part, name: string) {
  return p.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function parseAddress(v: string | null): { name: string | null; email: string | null } {
  if (!v) return { name: null, email: null };
  const m = v.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: v.trim().toLowerCase() };
}

const AUTOMATED = /(no-?reply|do-?not-?reply|mailer-daemon|notifications?@|newsletter|bounce|postmaster)/i;

/* Sync ----------------------------------------------------------------- */

type Normalized = {
  gmail_message_id: string;
  rfc_message_id: string | null;
  direction: "inbound" | "outbound";
  from_name: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
};

function normalize(m: GmailMessage, ownEmail: string): Normalized {
  const from = parseAddress(header(m.payload, "From"));
  const to = parseAddress(header(m.payload, "To"));
  const plain = findPart(m.payload, "text/plain");
  const html = plain ? null : findPart(m.payload, "text/html");
  const body = stripQuoted(plain ?? (html ? htmlToText(html) : "")).slice(0, 20_000);
  return {
    gmail_message_id: m.id,
    rfc_message_id: header(m.payload, "Message-ID"),
    direction: from.email === ownEmail || m.labelIds?.includes("SENT") ? "outbound" : "inbound",
    from_name: from.name,
    from_email: from.email,
    to_email: to.email,
    subject: header(m.payload, "Subject"),
    body,
    sent_at: new Date(Number(m.internalDate)).toISOString(),
  };
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        out.push(await fn(item));
      }
    }),
  );
  return out;
}

/**
 * Imports recent customer threads. Idempotent: conversations upsert on thread id,
 * messages on Gmail message id. Analysis happens afterwards, in stages.
 */
export async function syncInbox(supabase: SupabaseClient, business: Business) {
  const admin = supabaseAdmin();
  const conn = dbOk(await supabase.from("gmail_connections").select("email").eq("business_id", business.id).maybeSingle()) as { email: string } | null;
  if (!conn) throw new AppError("gmail_not_connected");
  const own = conn.email.toLowerCase();

  try {
    const q = "in:inbox -category:promotions -category:social -category:updates -category:forums newer_than:30d";
    const list = await gmail<{ threads?: { id: string }[] }>(business.id, `/threads?maxResults=30&q=${encodeURIComponent(q)}`);
    const ids = (list.threads ?? []).map((t) => t.id);

    const existing = new Map(
      ((dbOk(
        await supabase.from("conversations").select("id, gmail_thread_id, last_message_at, state").in("gmail_thread_id", ids.length ? ids : ["-"]),
      ) ?? []) as Pick<Conversation, "id" | "gmail_thread_id" | "last_message_at" | "state">[]).map((c) => [c.gmail_thread_id!, c]),
    );

    let imported = 0;
    await pool(ids, 5, async (threadId) => {
      const thread = await gmail<{ messages?: GmailMessage[] }>(business.id, `/threads/${threadId}?format=full`);
      const msgs = (thread.messages ?? []).map((m) => normalize(m, own)).sort((a, b) => a.sent_at.localeCompare(b.sent_at));
      const firstInbound = msgs.find((m) => m.direction === "inbound");
      // Skip owner-only threads and automated senders.
      if (!firstInbound || !firstInbound.from_email || AUTOMATED.test(firstInbound.from_email)) return;

      const last = msgs[msgs.length - 1];
      const prev = existing.get(threadId);
      const changed = !prev || new Date(last.sent_at).getTime() > new Date(prev.last_message_at).getTime();

      const base = {
        business_id: business.id,
        source: "gmail" as const,
        gmail_thread_id: threadId,
        customer_name: firstInbound.from_name,
        customer_email: firstInbound.from_email,
        subject: firstInbound.subject,
        last_message_at: last.sent_at,
        last_message_preview: last.body.slice(0, 200),
        last_direction: last.direction,
      };

      let conversationId = prev?.id;
      if (!prev) {
        const row = dbOk(
          await supabase
            .from("conversations")
            .upsert({ ...base, state: "new", needs_analysis: last.direction === "inbound" }, { onConflict: "business_id,gmail_thread_id" })
            .select("id")
            .single(),
        ) as { id: string };
        conversationId = row.id;
        imported++;
      } else if (changed) {
        const customerSpoke = last.direction === "inbound";
        dbOk(
          await supabase
            .from("conversations")
            .update({
              ...base,
              needs_analysis: customerSpoke,
              // The customer replying reopens the conversation for the owner.
              state: customerSpoke ? "needs_attention" : prev.state === "resolved" ? "resolved" : "waiting_customer",
            })
            .eq("id", prev.id),
        );
      }

      if (changed && conversationId) {
        dbOk(
          await supabase.from("messages").upsert(
            msgs.map((m) => ({ ...m, conversation_id: conversationId, business_id: business.id })),
            { onConflict: "business_id,gmail_message_id", ignoreDuplicates: true },
          ),
        );
      }
    });

    const syncedAt = new Date().toISOString();
    await admin.from("gmail_connections").update({ last_synced_at: syncedAt, last_sync_error: null, status: "connected" }).eq("business_id", business.id);
    return { imported, scanned: ids.length, syncedAt };
  } catch (e) {
    log("gmail.sync_failed", { business: business.id, message: errMessage(e) });
    await admin.from("gmail_connections").update({ last_sync_error: "The last sync didn’t finish" }).eq("business_id", business.id);
    if (e instanceof AppError && (e.code === "gmail_auth_failed" || e.code === "gmail_not_connected" || e.code === "supabase_unavailable")) throw e;
    throw new AppError("gmail_sync_failed", errMessage(e));
  }
}

/* Send ----------------------------------------------------------------- */

const noBreaks = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);

/** Sends an owner-approved reply in the same Gmail thread. */
export async function sendReply(
  business: Business,
  conversation: Pick<Conversation, "gmail_thread_id" | "customer_email" | "subject">,
  inReplyTo: string | null,
  body: string,
) {
  const conn = (await supabaseAdmin().from("gmail_connections").select("email").eq("business_id", business.id).maybeSingle()).data;
  if (!conn) throw new AppError("gmail_not_connected");
  if (!conversation.customer_email) throw new AppError("invalid_input", "no recipient");

  const subject = noBreaks(conversation.subject ?? "your message");
  const lines = [
    `From: ${encodeHeader(noBreaks(business.name))} <${noBreaks(conn.email)}>`,
    `To: ${noBreaks(conversation.customer_email)}`,
    `Subject: ${encodeHeader(/^re:/i.test(subject) ? subject : `Re: ${subject}`)}`,
    ...(inReplyTo ? [`In-Reply-To: ${noBreaks(inReplyTo)}`, `References: ${noBreaks(inReplyTo)}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
  ];
  const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");

  try {
    return await gmail<{ id: string; threadId: string }>(business.id, "/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw, threadId: conversation.gmail_thread_id ?? undefined }),
    });
  } catch (e) {
    log("gmail.send_failed", { business: business.id, message: errMessage(e) });
    if (e instanceof AppError && e.code === "gmail_auth_failed") throw e;
    throw new AppError("gmail_send_failed", errMessage(e));
  }
}
