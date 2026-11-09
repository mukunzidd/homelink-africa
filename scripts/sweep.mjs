#!/usr/bin/env node
/**
 * Open every screen as each person who would see it, at phone, tablet and
 * desktop widths, in light and dark, and report what a person would notice:
 * the page scrolling sideways, an error in the console, a missing
 * translation, a broken image, or the word "lease" or "bail" on screen.
 *
 *   make sweep                        # against http://localhost:3100
 *   BASE=http://localhost:3000 node scripts/sweep.mjs
 *   ONLY=manage node scripts/sweep.mjs   # paths containing "manage"
 *
 * Writes a first-screen capture of every visit and report.json to .sweep/
 * (kept apart from .e2e-results, which Playwright empties on every run).
 * Exits 1 if anything is found.
 *
 * Not a test. The e2e suite proves journeys work; this proves nothing on a
 * screen is visibly wrong, which no journey asserts. It needs the dev server
 * started with HOMELINK_E2E=1 so it can reset the fixture store first.
 *
 * Workspace pages are taken from each role's own sidebar rather than from a
 * list kept here, so the sweep checks what people are actually shown.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3100";
const ONLY = process.env.ONLY;
const OUT = ".sweep";
const WIDTHS = { phone: [390, 844], tablet: [1024, 768], desktop: [1440, 900] };
const LOCALES = ["en", "fr", "rw", "sw"];
const IGNORED_CONSOLE = ["Download the React DevTools"];
const FORBIDDEN = /\b(lease[sd]?|leasing|bail|baux)\b/i;

const SITE = [
  "", "/stays", "/stays?band=long", "/stays/kimihurura-convention-studio", "/stays/kacyiru-garden-apartment/rent",
  "/cars", "/cars/toyota-rav4", "/experiences", "/buy", "/neighbourhoods", "/neighbourhoods/Kimihurura",
  "/saved", "/trip", "/trips", "/messages", "/notifications", "/account", "/account/renting", "/account/viewings",
  "/account/payments", "/account/settings", "/account/settings/security", "/account/settings/payment-methods",
  "/account/settings/preferences", "/account/settings/privacy", "/account/settings/notifications", "/account/verify-id",
  "/help", "/help/cancel-stay", "/contact", "/legal/terms", "/legal/privacy", "/legal/cancellation",
];
const BOOKING = (d) => [
  `/stays/kimihurura-convention-studio/book?from=${d(200)}&to=${d(203)}&party=2`,
  `/cars/toyota-rav4/book?from=${d(200)}&to=${d(203)}`,
];
const VISITOR = ["", "/sign-in", "/sign-up", "/verify?to=0788123456", "/forgot", "/check-email?to=ange%40example.rw", "/no-such-page"];
const BUSIEST = ["", "/stays", "/stays/kimihurura-convention-studio", "/trips", "/messages", "/account/settings", "/help"];
const WORKSPACE_ROLES = ["ops", "admin", "driver", "guide"];

const day = (n) => new Date(Date.now() + 2 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);

/** Each visit: [role, locale, path, width, scheme]. */
function plan(dynamic, workspace) {
  const visits = [];
  const add = (role, locale, path, widths, schemes) => {
    if (ONLY && !path.includes(ONLY)) return;
    for (const w of widths) for (const s of schemes) visits.push([role, locale, path, w, s]);
  };
  for (const p of [...SITE, ...dynamic, ...BOOKING(day)]) add("guest", "en", p, ["phone", "tablet", "desktop"], ["light"]);
  for (const p of [...SITE, ...dynamic]) add("guest", "en", p, ["phone", "desktop"], ["dark"]);
  for (const p of VISITOR) add("visitor", "en", p, ["phone", "desktop"], ["light", "dark"]);
  for (const l of LOCALES.slice(1)) for (const p of BUSIEST) add("guest", l, p, ["phone"], ["light"]);
  for (const [role, paths] of Object.entries(workspace)) {
    for (const p of paths) {
      add(role, "en", p, ["phone", "desktop"], ["light"]);
      add(role, "en", p, ["tablet"], ["dark"]);
    }
  }
  for (const l of LOCALES.slice(1)) for (const p of ["/manage/today", "/manage/overview", "/manage/finance", "/manage/jobs"]) {
    add(p === "/manage/jobs" ? "driver" : p === "/manage/today" ? "ops" : "admin", l, p, ["phone"], ["light"]);
  }
  return visits;
}

async function contextFor(browser, role, width, scheme) {
  const [w, h] = WIDTHS[width];
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  await context.addCookies([{ name: "homelink.role", value: role, url: BASE }]);
  await context.addInitScript((r) => localStorage.setItem("homelink.preferences", JSON.stringify({ role: r })), role);
  return context;
}

/** Links found on a page that match a prefix: experience and sale slugs, one booking, one partner. */
async function discover(browser) {
  const context = await contextFor(browser, "guest", "desktop", "light");
  const page = await context.newPage();
  const first = async (url, re) => {
    await page.goto(BASE + url);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    return hrefs.map((h) => h.replace(/^\/en/, "")).find((h) => re.test(h));
  };
  const found = [
    await first("/en/experiences", /^\/experiences\/[^/?]+$/),
    await first("/en/buy", /^\/buy\/[^/?]+$/),
    await first("/en/trips", /^\/bookings\/HL-[^/?]+$/),
  ].filter(Boolean);
  if (found[2]) found.push(`${found[2]}/receipt`);
  const exp = found.find((f) => f.startsWith("/experiences/"));
  if (exp) found.push(`${exp}/book?date=${day(200)}&party=2`);
  const sale = found.find((f) => f.startsWith("/buy/"));
  if (sale) found.push(`${sale}/viewing`);
  await context.close();
  return found;
}

async function sidebars(browser) {
  const out = {};
  for (const role of WORKSPACE_ROLES) {
    const context = await contextFor(browser, role, "desktop", "light");
    const page = await context.newPage();
    await page.goto(`${BASE}/en/manage`);
    await page.waitForLoadState("networkidle");
    const hrefs = await page.$$eval("aside nav a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const paths = [...new Set(hrefs.map((h) => h.replace(/^\/en/, "").split("?")[0]).filter((h) => h.startsWith("/manage")))];
    // One detail page each, where the role has the list it hangs off.
    if (paths.includes("/manage/bookings")) {
      await page.goto(`${BASE}/en/manage/bookings`);
      const ref = await page.$$eval("a[href*='/manage/bookings/HL-']", (as) => as[0]?.getAttribute("href"));
      if (ref) paths.push(ref.replace(/^\/en/, ""));
    }
    if (paths.includes("/manage/portfolio")) paths.push("/manage/portfolio/kimihurura-convention-studio", "/manage/portfolio/kimihurura-convention-studio?tab=availability");
    if (paths.includes("/manage/partners")) paths.push("/manage/partners/ptn_eric");
    if (paths.includes("/manage/finance")) for (const tab of ["payouts", "refunds", "reconcile", "fx", "statement", "invoices"]) paths.push(`/manage/finance?tab=${tab}`);
    out[role] = paths;
    await context.close();
  }
  return out;
}

async function visit(browser, [role, locale, path, width, scheme]) {
  const context = await contextFor(browser, role, width, scheme);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`error: ${String(e).split("\n")[0]}`));
  const notFoundExpected = path === "/no-such-page";
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const text = m.text();
    if (notFoundExpected && text.includes("status of 404")) return;
    if (IGNORED_CONSOLE.some((i) => text.includes(i))) return;
    if (text.includes("MISSING_MESSAGE")) problems.push(`missing message: ${text.slice(0, 160)}`);
    else if (m.type() === "error") problems.push(`console: ${text.split("\n")[0].slice(0, 200)}`);
  });
  const url = `${BASE}/${locale}${path}`;
  let status = 0;
  try {
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    status = res?.status() ?? 0;
  } catch (e) {
    problems.push(`load: ${String(e).split("\n")[0]}`);
  }
  if (status >= 500 || (status === 404 && !notFoundExpected)) problems.push(`status ${status}`);

  // Scroll through so lazy images load, then come back to the top for the capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});

  const seen = await page.evaluate(() => {
    const broken = [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src"))
      .map((i) => i.getAttribute("src"));
    // Text wider than its own box that is not a deliberate ellipsis or a
    // scroll area: a figure running out of a tile, a label under a neighbour.
    const clipped = [...document.querySelectorAll("body *")]
      .filter((e) => {
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
        const cs = getComputedStyle(e);
        if (cs.textOverflow === "ellipsis" || cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.display === "inline") return false;
        if (e.closest("[class*='line-clamp'], [aria-hidden='true'], svg, select, option, textarea, .sr-only")) return false;
        if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
        return e.clientWidth >= 8 && e.scrollWidth > e.clientWidth + 1;
      })
      .map((e) => `${e.textContent.trim().slice(0, 40)} (${e.scrollWidth}>${e.clientWidth})`);
    return {
      clipped,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
      broken,
      text: document.body.innerText,
    };
  }).catch(() => null);
  if (seen) {
    if (seen.scrollWidth > seen.innerWidth) problems.push(`scrolls sideways: ${seen.scrollWidth}px in ${seen.innerWidth}px`);
    for (const c of seen.clipped.slice(0, 5)) problems.push(`clipped: ${c}`);
    for (const src of seen.broken) problems.push(`broken image: ${src.slice(0, 120)}`);
    // Rwanda groups money with commas; a period reads as a decimal point.
    const grouped = /\b(RWF|RF|Frw)\s?\d{1,3}\.\d{3}\b/.exec(seen.text);
    if (grouped) problems.push(`money grouped with a period: "${grouped[0]}"`);
    const word = FORBIDDEN.exec(seen.text);
    if (word) problems.push(`says "${word[0]}"`);
  }
  const name = `${role}_${locale}${path.replace(/[/?=&%.]+/g, "_") || "_home"}_${width}_${scheme}.png`;
  await page.screenshot({ path: `${OUT}/${name}` }).catch(() => {});
  await context.close();
  return { role, locale, path, width, scheme, status, problems, capture: name };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const reset = await fetch(`${BASE}/api/dev/reset`, { method: "POST" });
  if (!reset.ok) {
    console.error(`Reset refused (${reset.status}). Start the server with HOMELINK_E2E=1.`);
    process.exit(2);
  }
  const browser = await chromium.launch({ channel: "chrome" });
  const visits = plan(await discover(browser), await sidebars(browser));
  console.log(`${visits.length} visits`);
  const results = [];
  const queue = [...visits];
  const workers = Array.from({ length: Number(process.env.WORKERS ?? 3) }, async () => {
    while (queue.length) {
      const v = queue.shift();
      const r = await visit(browser, v);
      results.push(r);
      if (r.problems.length) console.log(`✗ ${r.role} ${r.locale}${r.path} ${r.width}/${r.scheme}\n    ${r.problems.join("\n    ")}`);
    }
  });
  await Promise.all(workers);
  await browser.close();
  await writeFile(`${OUT}/report.json`, JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.problems.length);
  console.log(`\n${results.length} visits, ${bad.length} with problems. Captures and report.json in ${OUT}/`);
  process.exit(bad.length ? 1 : 0);
}

main();
