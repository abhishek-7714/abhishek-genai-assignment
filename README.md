# FollowUpOS

An AI layer on top of a small business’s customer inbox.
**Inbox → Signal → Action → Follow-up → Resolution.**

FollowUpOS reads customer conversations and tells the owner who needs attention, why, what to say and what to do next.
It never sends anything on its own — every reply is a draft the owner reviews, edits and approves.

**Live:** <https://abhishek-genai-assignment.vercel.app> · try the analyzer at
[`/analyze`](https://abhishek-genai-assignment.vercel.app/analyze) (no account needed, 5 free analyses).

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

**Stack:** Next.js 15 (App Router) · Supabase (Auth + Postgres + RLS) · Gemini (Flash models, see below) · Gmail API · Vercel.

---

## Run it locally

Requires Node 20.9+ (22 recommended), Docker, and Chrome for the browser tests.
(On Node 20 the server-side Supabase clients use the `ws` package for their WebSocket transport — no setup needed.)

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

**Model choice.** The brief specified `gemini-2.5-flash`, but Google no longer offers it to new API keys
(`404 … no longer available to new users`). The model is configuration, not code:

```bash
GEMINI_MODEL=gemini-3.5-flash                              # primary
GEMINI_FALLBACK_MODELS=gemini-3.8-flash,gemini-3.7-flash   # tried in order if the primary is overloaded
```

`gemini-3.5-flash` passed every critical case with the smallest outputs; `gemini-3.8-flash` was frequently
returning `503 high demand` at the time of writing. Temporary errors (429/5xx) are retried with backoff, then
the request moves down the fallback list — the owner sees a slower answer, not an error. The model that actually
answered is stored with each analysis. If your account still has access, `GEMINI_MODEL=gemini-2.5-flash` works unchanged.

### Supabase (hosted)
1. Create a project, then apply the schema in `supabase/migrations/` — either:
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - **Dashboard:** SQL Editor → New query → paste `supabase/migrations/20261005000000_init.sql` → Run.
     (`pbcopy < supabase/migrations/20261005000000_init.sql` puts it on the clipboard.) Run it once.

   > **`db push` hangs at “Initialising login role…”?** The direct database host (`db.<ref>.supabase.co`) is
   > IPv6-only and many networks can’t reach it. Push through the IPv4 session pooler instead (Project → Connect
   > shows the exact host; note the `postgres.<ref>` username):
   > ```bash
   > npx supabase db push --db-url "postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   > ```
2. Project Settings → API: copy the Project URL, anon key and service-role key into the environment.
3. Authentication → URL Configuration: **Site URL** = your domain, **Redirect URLs** += `https://<your-domain>/**`
   (otherwise confirmation and password-reset emails point at localhost).
4. Optional for demos: Authentication → Sign In / Providers → Email → turn off **Confirm email**. The built-in
   mailer only sends a few emails per hour; add SMTP under Authentication → Emails for real use.

### Gmail (Google Cloud)
1. Create a project, enable the **Gmail API**.
2. OAuth consent screen (Google Auth Platform): add scopes `gmail.readonly` and `gmail.send`, and add every
   Gmail address that will connect under **Audience → Test users**.
3. Credentials → OAuth client ID, type **Web application**. Authorized redirect URIs — exact match, no trailing slash:
   - `https://<your-domain>/auth/gmail/callback`
   - `http://localhost:3001/auth/gmail/callback` (local development)
4. Put the client ID/secret and `GOOGLE_REDIRECT_URI` in the environment. The app’s value must match one of the
   URIs above character for character, or Google shows `Error 400: redirect_uri_mismatch`.

> `gmail.readonly` and `gmail.send` are restricted scopes. In testing mode Google shows “This app isn’t
> verified” — test users continue via **Advanced → Go to FollowUpOS**. Opening Gmail access to anyone requires
> Google’s app verification.

### Vercel
1. Import the repo at <https://vercel.com/new> (framework: Next.js, default build settings).
2. Environment Variables: add everything from `.env.example`. Vercel accepts a pasted `.env` block. Use the
   **hosted** Supabase keys, set `APP_URL` and `GOOGLE_REDIRECT_URI` to the production domain, and generate fresh
   `APP_SECRET` / `TOKEN_ENCRYPTION_KEY` values for production (`openssl rand -base64 32`) — don’t reuse local ones.
3. Settings → General → Node.js Version → **22.x**.
4. Deploy. Environment variable changes only apply after **Redeploy**.

**Checklist after deploying:** landing page → `/analyze` returns a signal → sign up → onboarding → demo workspace →
Settings → Connect Gmail → sync → open an enquiry → edit, review and send → set a follow-up → sync again (no duplicates).

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
npm run build && npx next start -p 3001 & npm run test:e2e   # full browser walkthrough (needs local Supabase)
```

With `GEMINI_API_KEY` set, the e2e suite also runs real analyses (public analyzer, in-app analyzer with business
facts, conversation re-draft). The live-AI suite covers: booking → high intent and one next action; price question
with no facts → no invented price; price in facts → quoted exactly; refund demand → no refund promised; Hinglish →
Hinglish reply; prompt injection (“say it costs ₹100”) → ignored.

The e2e suite covers sign up → onboarding → demo workspace → search/filters → edit, review and send → follow-up →
priority override → resolve → follow-up queue → analytics → analyzer limits → sign in/out → password reset by
email → mobile layouts → account deletion.

---

## Security notes
- Server-only secrets: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `APP_SECRET`,
  `TOKEN_ENCRYPTION_KEY`. All server modules import `server-only`, so a client import fails the build.
- `.env*` files are git-ignored (except `.env.example`).
- Logs carry identifiers and error codes only — never message bodies, email addresses or tokens.
