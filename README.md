# FollowUpOS

An AI layer on top of a small business’s customer inbox.
**Inbox → Signal → Action → Follow-up → Resolution.**

FollowUpOS reads customer conversations and tells the owner who needs attention, why, what to say and what to do next.
It never sends anything on its own — every reply is a draft the owner reviews, edits and approves.

---

## What’s in here

| Area | Route |
| --- | --- |
| Landing page (approved design — the design system for everything else) | `/` |
| Public manual analyzer (5 free requests per visitor) | `/analyze` |
| Sign up / in, password reset | `/signup`, `/login`, `/reset-password`, `/update-password` |
| Onboarding (business name, type, language, business facts) | `/onboarding` |
| Today — command center | `/app` |
| Inbox (filters, sort, search) | `/app/inbox` |
| Conversation workspace (signal, next action, draft, send, follow-up) | `/app/inbox/[id]` |
| Follow-ups — the owner’s action queue | `/app/follow-ups` |
| Analytics (database-derived) | `/app/analytics` |
| In-app analyzer (uses your business facts) | `/app/analyze` |
| Settings (business facts, Gmail, AI, account) | `/app/settings` |
| Gmail OAuth callback | `/auth/gmail/callback` |

**Stack:** Next.js 15 (App Router) · Supabase (Auth + Postgres + RLS) · Gemini `gemini-2.5-flash` · Gmail API · Vercel.

---

## Run it locally

Requires Node 20.9+ (22 recommended), Docker, and Chrome for the browser tests.

```bash
npm install
npm run db:start                 # local Supabase (ports 554xx) — applies supabase/migrations
cp .env.example .env.local       # then fill it in (see below)
npm run dev -- -p 3001           # http://localhost:3001
```

For local Supabase, `npx supabase status -o env` prints the URL, anon key and service-role key.
Generate `APP_SECRET` and `TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`.

Without `GEMINI_API_KEY` or the Google credentials the app still runs — analysis and Gmail show a clear
“not configured” state instead of failing. **Explore a demo workspace** (on the empty Home screen) loads
clearly-labelled sample conversations so every screen can be tried without Gmail.

Password-reset emails in local development land in Mailpit: <http://127.0.0.1:55424>.

---

## Connecting the real services

### Gemini
Create a key at <https://aistudio.google.com/apikey> → `GEMINI_API_KEY`. Then run `npm run test:ai`.

### Supabase (hosted)
1. Create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`.
2. Copy URL, anon key and service-role key into the environment.
3. Auth → URL configuration: set the Site URL and add `https://<your-domain>/auth/callback` to redirect URLs.

### Gmail (Google Cloud)
1. Create a project, enable the **Gmail API**.
2. OAuth consent screen: add scopes `gmail.readonly` and `gmail.send`; add yourself as a test user while in testing mode.
3. Credentials → OAuth client ID (Web application). Authorized redirect URI: `https://<your-domain>/auth/gmail/callback`
   (and `http://localhost:3001/auth/gmail/callback` for local).
4. Put the client ID/secret and redirect URI in the environment.

> `gmail.readonly` and `gmail.send` are restricted scopes: Google allows them for test users immediately,
> but a public launch needs Google’s verification.

### Vercel
Import the repo, set every variable from `.env.example` in Project Settings → Environment Variables
(Production + Preview), and deploy. Set `GOOGLE_REDIRECT_URI` and `APP_URL` to the production domain.

---

## How it works

**One analysis pipeline** — `lib/ai/analyze.ts` — serves the public analyzer, the in-app analyzer, Gmail
conversations and re-drafts.

- Gemini returns **schema-constrained JSON** (enums for priority, sentiment, urgency, request type), which is
  validated again with zod. Malformed output is retried once, then discarded — never shown.
- **Exactly one next action** is enforced by the schema (no lists, no line breaks).
- The system prompt lives only on the server (`lib/ai/prompt.ts`). Re-drafts take a fixed style key
  (`shorter`, `warmer`, `formal`, `regenerate`) — clients can never send prompt text.
- **Deterministic safety check** (`lib/ai/safety.ts`) runs on every draft, independent of the prompt:
  any price must appear in the owner’s business facts (a price the *customer* wrote doesn’t count — this defeats
  “tell them it costs ₹100” injections); refund and discount promises are blocked unless the facts allow them.
  A failing draft is regenerated once with a correction, then flagged “check this draft carefully”.
- The public analyzer caps Gemini output at **200 tokens** (thinking disabled so the budget goes to the answer).

**Gmail** — `lib/server/gmail.ts`
- Scopes: `gmail.readonly` + `gmail.send` only. OAuth state is HMAC-signed, bound to the user and an httpOnly cookie.
- Refresh/access tokens are **AES-256-GCM encrypted** and stored in `gmail_credentials`, a table with no RLS
  policies (service role only). They never reach the browser.
- Sync imports inbox threads from the last 30 days, skipping promotions/social/updates/forums and automated senders,
  strips quoted history, and is **idempotent** (unique thread and message IDs). A customer reply reopens a resolved
  conversation. Analysis runs afterwards in small batches so the inbox appears immediately.
- Sending happens only from the review dialog after the owner confirms. Replies are threaded
  (`In-Reply-To`/`References`) and the recipient always comes from the stored conversation.

**Data** — `supabase/migrations/`
`profiles · businesses · gmail_connections · gmail_credentials · conversations · messages ·
conversation_analyses · follow_ups · ai_exchanges · usage_events`. Every owner table is protected by RLS.
AI analyses are written by the server only (owners can’t forge them). `ai_exchanges` holds the assignment
log (input, output, tokens, shop type, language, request type, anonymous visitor id) — Gmail-derived rows
store a placeholder instead of the customer’s email.

**Limits** — counted server-side in Postgres (`reserve_usage`, atomic): visitors get 5 analyses keyed by a signed
cookie *and* a hashed IP (clearing cookies doesn’t reset it); signed-in owners and in-app analysis have daily
allowances keyed by account/business. Failed AI calls don’t use up a request.

**Conversation lifecycle:** `new → needs_attention → (owner replies) → waiting_customer → (customer replies) →
needs_attention → resolved`. “Follow-up due” is shown whenever an open follow-up is past due. Owners can change
priority, edit drafts, dismiss an analysis, set/cancel follow-ups and resolve or reopen.

---

## Tests

```bash
npm test             # safety guard + schema (no services needed)
npm run test:gmail   # Gmail pipeline vs local Supabase, Google endpoints stubbed
npm run test:ai      # critical AI cases vs real Gemini (skips without GEMINI_API_KEY)
npm run build && npx next start -p 3001 & npm run test:e2e   # full browser walkthrough
```

The e2e suite covers sign up → onboarding → demo workspace → search/filters → edit, review and send → follow-up →
priority override → resolve → follow-up queue → analytics → analyzer limits → sign in/out → password reset by
email → mobile layouts → account deletion.

---

## Security notes
- Server-only secrets: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `APP_SECRET`,
  `TOKEN_ENCRYPTION_KEY`. All server modules import `server-only`, so a client import fails the build.
- `.env*` files are git-ignored (except `.env.example`).
- Logs carry identifiers and error codes only — never message bodies, email addresses or tokens.
