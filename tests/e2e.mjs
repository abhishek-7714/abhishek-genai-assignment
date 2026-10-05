/**
 * End-to-end walkthrough against a running build + local Supabase.
 *   npm run build && npx next start -p 3001 & node tests/e2e.mjs
 * Uses the system Chrome (CHROME_PATH to override). Screenshots → .qa/shots
 */
import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:55422/postgres";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:55424";
const SHOTS = ".qa/shots";
fs.mkdirSync(SHOTS, { recursive: true });

const email = `owner-${Date.now()}@salon.test`;
const password = "correct-horse-42";
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync(`psql "${DB}" -tA -c ${JSON.stringify(q)}`).toString().trim();

async function step(name, fn) {
  try {
    await fn();
    results.push(["PASS", name]);
    console.log("PASS", name);
  } catch (e) {
    results.push(["FAIL", name, e.message]);
    console.log("FAIL", name, "—", e.message);
    await page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => {});
    console.log("   page:", page.url(), "|", (await text().catch(() => "")).slice(0, 300).replace(/\n+/g, " / "));
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/favicon|400|401|404|503/.test(m.text()) && consoleErrors.push(m.text()));

const text = () => page.evaluate(() => document.body.innerText);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickText = async (selector, label) => {
  const ok = await page.evaluate(
    (sel, lbl) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(lbl) && !e.disabled);
      if (el) el.click();
      return Boolean(el);
    },
    selector,
    label,
  );
  assert(ok, `no ${selector} with "${label}"`);
};
// innerText applies CSS text-transform, so match case-insensitively.
const waitText = (t, timeout = 10000) =>
  page.waitForFunction((s) => document.body.innerText.toLowerCase().includes(s.toLowerCase()), { timeout }, t);

await step("landing CTAs point to the analyzer", async () => {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const hrefs = await page.$$eval("a", (as) => as.filter((a) => a.textContent.includes("Try FollowUpOS")).map((a) => a.getAttribute("href")));
  assert(hrefs.length >= 3 && hrefs.every((h) => h === "/analyze"), `hrefs: ${hrefs}`);
});

await step("protected route redirects to sign in", async () => {
  await page.goto(`${BASE}/app/inbox`, { waitUntil: "networkidle0" });
  assert(page.url().includes("/login?next=%2Fapp%2Finbox"), page.url());
});

await step("sign up → onboarding", async () => {
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle0" });
  await page.type("#name", "Asha");
  await page.type("#email", email);
  await page.type("#password", password);
  await shot("01-signup");
  await page.click("button.btn-dark");
  await page.waitForFunction(() => location.pathname === "/onboarding", { timeout: 15000 });
});

await step("onboarding saves business + facts → empty workspace", async () => {
  await page.type("#biz-name", "Sharp Cuts Salon");
  await clickText("button", "Use a template");
  await page.$eval("#biz-facts", (el) => (el.value = ""));
  await page.type("#biz-facts", "Haircut + beard — ₹500\nOpening hours: 10 AM – 8 PM\nAppointments required on Sundays.");
  await shot("02-onboarding");
  await clickText("button", "Open my workspace");
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 15000 });
  await waitText("Your inbox is waiting.");
  await shot("03-empty-home");
  const facts = sql(`select facts from businesses b join auth.users u on u.id = b.owner_id where u.email = '${email}'`);
  assert(facts.includes("₹500"), "facts not stored");
});

await step("demo workspace loads with database-derived metrics", async () => {
  for (let i = 0; i < 3; i++) {
    await clickText("button", "Explore a demo workspace");
    try {
      await waitText("What needs you today.", 8000);
      break;
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  await sleep(600);
  const metrics = await page.$$eval("section[aria-label='Today at a glance'] a", (as) =>
    Object.fromEntries(as.map((a) => [a.querySelector("span").textContent, a.querySelectorAll("span")[1].textContent])),
  );
  assert(metrics["Needs attention"] === "4", JSON.stringify(metrics));
  assert(metrics["High intent"] === "4", JSON.stringify(metrics));
  assert(metrics["Follow-ups overdue"] === "1", JSON.stringify(metrics));
  assert(metrics["Waiting for customer"] === "2", JSON.stringify(metrics));
  assert((await text()).includes("You’re looking at demo data"), "demo banner missing");
  await shot("04-home-demo");
});

await step("inbox search finds message content", async () => {
  await page.goto(`${BASE}/app/inbox?q=chocolate`, { waitUntil: "networkidle0" });
  const names = await page.$$eval("ul li strong", (s) => s.map((x) => x.textContent));
  assert(names.length === 1 && names[0] === "Priya Singh", JSON.stringify(names));
});

await step("inbox filters", async () => {
  await page.goto(`${BASE}/app/inbox?filter=resolved`, { waitUntil: "networkidle0" });
  let names = await page.$$eval("ul li strong", (s) => s.map((x) => x.textContent));
  assert(names.join() === "Arjun Nair", `resolved: ${names}`);
  await page.goto(`${BASE}/app/inbox?filter=waiting`, { waitUntil: "networkidle0" });
  names = await page.$$eval("ul li strong", (s) => s.map((x) => x.textContent).sort());
  assert(names.join() === "Meera Kapoor,Priya Singh", `waiting: ${names}`);
  await page.goto(`${BASE}/app/inbox`, { waitUntil: "networkidle0" });
  await shot("05-inbox");
});

let rahulUrl;
await step("conversation: edit draft → review → send → follow-up", async () => {
  await page.goto(`${BASE}/app/inbox`, { waitUntil: "networkidle0" });
  await clickText("a", "Rahul Mehta");
  await page.waitForFunction(() => location.pathname.startsWith("/app/inbox/"));
  rahulUrl = page.url();
  await waitText("FollowUpOS signal");
  await shot("06-conversation");
  await clickText("button", "Edit response");
  await page.$eval("#draft", (el) => (el.value = ""));
  await page.type("#draft", "Hi Rahul! Sunday works. Haircut + beard is ₹500. What time suits you?");
  await clickText("button", "Done editing");
  await clickText("button", "Send reply");
  await page.waitForSelector("dialog[open]");
  await shot("07-review-dialog");
  await clickText("dialog[open] button", "Send (demo)");
  await waitText("Recorded as sent");
  await page.waitForSelector("dialog[open] #fu-action");
  await clickText("dialog[open] label", "Later today");
  await clickText("dialog[open] button", "Set follow-up");
  await waitText("Follow-up set");
  await sleep(500);
  const t = await text();
  assert(t.includes("Waiting for customer"), "state not updated");
  assert(t.includes("Demo — not emailed"), "outbound demo message not shown");
  const n = sql(`select count(*) from messages m join conversations c on c.id=m.conversation_id where c.customer_name='Rahul Mehta' and m.direction='outbound' and c.business_id=(select b.id from businesses b join auth.users u on u.id=b.owner_id where u.email='${email}')`);
  assert(n === "1", `outbound rows ${n}`);
  await shot("08-after-send");
});

await step("owner overrides priority", async () => {
  await page.goto(`${BASE}/app/inbox?q=Ananya`, { waitUntil: "networkidle0" });
  await clickText("a", "Ananya Sharma");
  await page.waitForSelector("#priority");
  await page.select("#priority", "medium");
  await waitText("set by you");
});

await step("mark resolved closes conversation", async () => {
  await page.goto(`${BASE}/app/inbox?q=Vikram`, { waitUntil: "networkidle0" });
  await clickText("a", "Vikram Rao");
  await waitText("Mark resolved");
  await clickText("button", "Mark resolved");
  await waitText("Marked as resolved");
  await waitText("Reopen");
});

await step("follow-ups queue: overdue + today, complete and snooze", async () => {
  await page.goto(`${BASE}/app/follow-ups`, { waitUntil: "networkidle0" });
  await waitText("Overdue");
  const t = await text();
  assert(t.includes("Check whether Priya has chosen a flavour"), "Priya overdue missing");
  assert(t.includes("Ask for preferred appointment time"), "Rahul follow-up missing");
  await shot("09-follow-ups");
  await clickText("button", "Complete");
  await waitText("Recently completed");
  const done = sql(`select count(*) from follow_ups f join businesses b on b.id=f.business_id join auth.users u on u.id=b.owner_id where u.email='${email}' and f.status='done'`);
  assert(done === "1", `done ${done}`);
});

await step("analytics excludes demo by default, includes on request", async () => {
  await page.goto(`${BASE}/app/analytics`, { waitUntil: "networkidle0" });
  assert((await text()).includes("Your insights will appear here"), "should be empty without demo");
  await page.goto(`${BASE}/app/analytics?demo=1`, { waitUntil: "networkidle0" });
  const t = await text();
  assert(t.includes("Including demo data") && t.includes("Most common request types"), "demo analytics missing");
  assert(t.includes("Appointment enquiry"), "request type chart missing");
  await shot("10-analytics");
});

await step("Connect Gmail starts Google OAuth with least-privilege scopes", async () => {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID);
  await page.goto(`${BASE}/app/settings`, { waitUntil: "networkidle0" });
  await shot("11-settings");
  if (!configured) {
    await page.goto(`${BASE}/api/gmail/connect`, { waitUntil: "networkidle0" });
    assert(page.url().includes("/app/settings?gmail=not_configured"), page.url());
    return;
  }
  // Don't follow into Google — inspect the redirect the app issues.
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/gmail/connect", { redirect: "manual" });
    return { type: r.type, status: r.status };
  });
  assert(res.type === "opaqueredirect", `expected a redirect, got ${JSON.stringify(res)}`);
  const ctx = await browser.createBrowserContext();
  const cookies = await page.cookies();
  const p = await ctx.newPage();
  await p.setCookie(...cookies);
  let location = null;
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    if (r.url().startsWith("https://accounts.google.com")) {
      location = r.url();
      r.abort();
    } else r.continue();
  });
  await p.goto(`${BASE}/api/gmail/connect`).catch(() => {});
  await ctx.close();
  assert(location, "no redirect to Google");
  const u = new URL(location);
  assert(u.searchParams.get("redirect_uri") === process.env.GOOGLE_REDIRECT_URI, `redirect_uri ${u.searchParams.get("redirect_uri")}`);
  const scopes = u.searchParams.get("scope").split(" ").sort().join(" ");
  assert(scopes === "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send", scopes);
  assert(u.searchParams.get("access_type") === "offline" && u.searchParams.get("state")?.split(".").length >= 3, "missing offline access or signed state");
});

const AI_LIVE = Boolean(process.env.GEMINI_API_KEY);

await step("public analyzer: real analysis, counts down, then limits", async () => {
  sql(`delete from usage_events where usage_key like 'visitor:%'`);
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1400, height: 900 });
  await p.goto(`${BASE}/analyze`, { waitUntil: "networkidle0" });
  await p.waitForFunction(() => document.body.innerText.includes("5 of 5 free analyses left"));
  // Empty input is rejected client-side without using a request.
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Analyze conversation")).click());
  await p.waitForFunction(() => document.body.innerText.includes("Paste what the customer wrote."));
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Prompt injection").click());
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Analyze conversation")).click());
  if (AI_LIVE) {
    await p.waitForFunction(() => document.body.innerText.includes("FollowUpOS signal") || document.body.innerText.includes("couldn’t read that"), { timeout: 90000 });
    const t = await p.evaluate(() => document.body.innerText);
    assert(t.includes("FollowUpOS signal"), "analysis did not render");
    assert(t.includes("4 of 5 free analyses left"), "counter did not decrement");
    assert(!/₹\s?100/.test(t.split("Suggested reply")[1] ?? ""), "injected price leaked into reply");
    await p.screenshot({ path: `${SHOTS}/12-analyzer-result.png` });
  } else {
    await p.waitForFunction(() => document.body.innerText.includes("AI isn’t set up yet"), { timeout: 15000 });
  }

  // Exhaust the allowance server-side, then confirm the limit UI — and that clearing cookies doesn't reset it.
  const cookie = (await p.cookies()).find((c) => c.name === "fu_vid");
  const vid = decodeURIComponent(cookie.value).split(".")[0];
  // Fill the allowance the way real requests do: same visitor key AND the same hashed IP.
  const ip = sql(`select coalesce(max(ip_hash), '') from usage_events where usage_key = 'visitor:${vid}'`);
  sql(`insert into usage_events (usage_key, ip_hash) select 'visitor:${vid}', ${ip ? `'${ip}'` : "null"} from generate_series(1,5)`);
  await p.reload({ waitUntil: "networkidle0" });
  await p.waitForFunction(() => document.body.innerText.includes("You’ve used your five free analyses."));
  await p.screenshot({ path: `${SHOTS}/13-analyzer-limit.png` });
  const res = await p.evaluate(async () => (await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ businessType: "salon", language: "english", message: "hi" }) })).status);
  assert(res === 429, `expected 429, got ${res}`);
  await p.deleteCookie(cookie);
  const afterClear = await p.evaluate(async () => (await fetch("/api/analyze")).json());
  assert(afterClear.remaining === 0, `cookie reset bypassed the limit: ${JSON.stringify(afterClear)}`);
  sql(`delete from usage_events where usage_key like 'visitor:%'`);
  await ctx.close();
});

if (AI_LIVE) {
  await step("in-app analyzer uses business facts (quotes ₹500, nothing invented)", async () => {
    await page.goto(`${BASE}/app/analyze`, { waitUntil: "networkidle0" });
    await page.type("#an-msg", "How much for haircut + beard on Sunday?");
    await clickText("button", "Analyze conversation");
    await page.waitForFunction(() => document.body.innerText.includes("FollowUpOS signal") || document.body.innerText.includes("couldn’t read that"), { timeout: 90000 });
    const t = await text();
    assert(t.includes("FollowUpOS signal"), "analysis failed");
    const reply = t.split(/Suggested reply/i)[1] ?? "";
    const amounts = reply.match(/₹\s?\d[\d,]*/g) ?? [];
    assert(amounts.every((a) => a.replace(/\D/g, "") === "500"), `unexpected amounts ${amounts}`);
    await shot("14-app-analyzer");
  });

  await step("conversation re-draft with real AI (Make it shorter)", async () => {
    await page.goto(rahulUrl, { waitUntil: "networkidle0" });
    await waitText("FollowUpOS signal");
    // Reopen so the draft panel shows (Rahul is waiting for the customer after the demo send).
    const before = sql(`select count(*) from conversation_analyses ca join conversations c on c.id = ca.conversation_id where c.customer_name='Rahul Mehta' and ca.model <> 'demo-sample' and c.business_id=(select b.id from businesses b join auth.users u on u.id=b.owner_id where u.email='${email}')`);
    await page.evaluate(() => document.querySelector("details summary[aria-label='Redraft options']").click());
    await clickText("button", "Make it shorter");
    // Wait on the database, not a relative-time label (AI calls can take a while under load).
    const countSql = `select count(*) from conversation_analyses ca join conversations c on c.id = ca.conversation_id where c.customer_name='Rahul Mehta' and ca.model <> 'demo-sample' and c.business_id=(select b.id from businesses b join auth.users u on u.id=b.owner_id where u.email='${email}')`;
    for (let i = 0; i < 90 && sql(countSql) === before; i++) await sleep(1000);
    const after = sql(`select count(*) from conversation_analyses ca join conversations c on c.id = ca.conversation_id where c.customer_name='Rahul Mehta' and ca.model <> 'demo-sample' and c.business_id=(select b.id from businesses b join auth.users u on u.id=b.owner_id where u.email='${email}')`);
    assert(Number(after) === Number(before) + 1, `no new AI analysis stored (${before} → ${after})`);
    const model = sql(`select ca.model||' '||coalesce(ca.output_tokens,0) from conversation_analyses ca join conversations c on c.id=ca.conversation_id where c.customer_name='Rahul Mehta' order by ca.created_at desc limit 1`);
    console.log("   re-draft by", model);
    await shot("15-redraft");
  });
}

await step("sign out → wrong password → sign in", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await page.click("button[aria-haspopup='menu']");
  await clickText("button[role='menuitem']", "Sign out");
  await page.waitForFunction(() => location.pathname === "/");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type("#email", email);
  await page.type("#password", "wrong-password");
  await page.click("button.btn-dark");
  await waitText("That email and password don’t match");
  await page.$eval("#password", (el) => (el.value = ""));
  await page.type("#password", password);
  await page.click("button.btn-dark");
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 15000 });
});

await step("password reset by email link", async () => {
  await page.click("button[aria-haspopup='menu']");
  await clickText("button[role='menuitem']", "Sign out");
  await page.waitForFunction(() => location.pathname === "/");
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  await page.goto(`${BASE}/reset-password`, { waitUntil: "networkidle0" });
  await page.type("#email", email);
  await page.click("button.btn-dark");
  await waitText("Check your inbox");
  let link;
  for (let i = 0; i < 20 && !link; i++) {
    await sleep(500);
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const msg = list.messages?.find((m) => m.To?.some((t) => t.Address === email));
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      link = (full.Text || full.HTML).match(/https?:\/\/[^\s"<>]+verify[^\s"<>]+/)?.[0]?.replace(/&amp;/g, "&");
    }
  }
  assert(link, "reset email not received");
  await page.goto(link, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => location.pathname === "/update-password", { timeout: 15000 });
  await page.type("#password", "new-password-99");
  await page.type("#confirm", "new-password-99");
  await page.click("button.btn-dark");
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 15000 });
});

await step("mobile layouts render", async () => {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const [n, url] of [["m1-home", "/app"], ["m2-inbox", "/app/inbox"], ["m3-conversation", rahulUrl], ["m4-follow-ups", "/app/follow-ups"], ["m5-analyze", "/analyze"]]) {
    await page.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "networkidle0" });
    await sleep(700);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `${n} horizontal overflow ${overflow}px`);
    await page.screenshot({ path: `${SHOTS}/${n}.png` });
  }
  await page.setViewport({ width: 1400, height: 900 });
});

await step("delete account removes all data", async () => {
  await page.goto(`${BASE}/app/settings`, { waitUntil: "networkidle0" });
  await clickText("button", "Delete account");
  await page.waitForSelector("#del-confirm");
  await page.type("#del-confirm", "DELETE");
  await clickText("dialog[open] button", "Delete account");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  const left = sql(`select count(*) from auth.users where email='${email}'`);
  assert(left === "0", "user still exists");
});

await step("no uncaught client errors", async () => {
  assert(!consoleErrors.length, consoleErrors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
