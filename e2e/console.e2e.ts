import { expect, test, type Page } from "@playwright/test";
import { as, hydrated, type Role } from "./helpers";

/**
 * Nothing a person does should put an error in the console.
 *
 * journeys.e2e.ts proves the journeys work; this proves they are quiet. On
 * each page it opens everything that announces a popup or a panel (menus,
 * listboxes, calendars, disclosures, tabs), closes it again, and records
 * every console error, uncaught exception and server error along the way.
 * Destructive buttons (sign out, delete, cancel, remove) are never pressed.
 * A few real actions are scripted on top: searching, saving, sending a
 * message, switching theme, changing dates.
 */

type Seen = { errors: string[] };

function watch(page: Page): Seen {
  const seen: Seen = { errors: [] };
  page.on("pageerror", (e) => seen.errors.push(`pageerror ${page.url()}: ${String(e).split("\n")[0]}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // A deliberate 404 page logs its own status; nothing else is excused.
    if (page.url().includes("/no-such-page") && text.includes("status of 404")) return;
    seen.errors.push(`console ${page.url()}: ${text.split("\n")[0].slice(0, 300)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500) seen.errors.push(`http ${r.status()} ${r.url()} (on ${page.url()})`);
  });
  return seen;
}

const DESTRUCTIVE = /sign out|log out|delete|remove|cancel|deactivat|refund|decline|refuse|reject|close the|take off|unpublish|mark .* ready|check in|check out/i;

/** Open each popup or panel on the page once, then close it. */
async function exercise(page: Page) {
  const triggers = page.locator(
    [
      "main button[aria-haspopup]:visible",
      "main [role=combobox]:visible",
      "main button[aria-expanded]:visible",
      "main [role=tab]:visible",
      "header button[aria-haspopup]:visible",
    ].join(", "),
  );
  const count = Math.min(await triggers.count(), 14);
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i);
    const name = ((await t.getAttribute("aria-label")) ?? (await t.textContent()) ?? "").trim();
    if (DESTRUCTIVE.test(name)) continue;
    if (!(await t.isVisible().catch(() => false)) || !(await t.isEnabled().catch(() => false))) continue;
    const before = page.url();
    await t.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(100);
    // A tab or link may navigate; come back so the rest of the list still exists.
    if (page.url() !== before) {
      await page.goto(before);
      await hydrated(page);
    }
  }
}

const SITE = ["", "/stays", "/stays?view=map", "/stays/kimihurura-convention-studio", "/stays/kacyiru-garden-apartment/rent", "/cars", "/cars/toyota-rav4", "/experiences", "/buy", "/neighbourhoods", "/saved", "/trip", "/trips", "/messages", "/notifications", "/account", "/account/settings", "/account/settings/preferences", "/account/payments", "/help", "/contact", "/no-such-page"];

const WORKSPACE: Record<Exclude<Role, "visitor" | "guest">, string[]> = {
  admin: ["/manage/overview", "/manage/bookings", "/manage/calendar", "/manage/finance", "/manage/finance?tab=refunds", "/manage/people", "/manage/content", "/manage/settings", "/manage/audit", "/manage/portfolio", "/manage/portfolio/kimihurura-convention-studio", "/manage/rates", "/manage/partners", "/manage/sales", "/manage/tenants"],
  ops: ["/manage/today", "/manage/asks", "/manage/inspections", "/manage/housekeeping", "/manage/maintenance", "/manage/incidents", "/manage/inbox", "/manage/notifications"],
  driver: ["/manage/jobs", "/manage/schedule", "/manage/earnings", "/manage/documents", "/manage/inbox"],
  guide: ["/manage/jobs", "/manage/schedule", "/manage/earnings", "/manage/documents"],
};

test.describe.configure({ timeout: 300_000 });

for (const role of ["visitor", "guest"] as const) {
  for (const width of [1280, 390]) {
    test(`${role} at ${width}px: opening every page and its menus logs nothing`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 860 });
      await as(context, role);
      const seen = watch(page);
      const paths = role === "visitor" ? ["", "/stays", "/stays/kimihurura-convention-studio", "/sign-in", "/sign-up", "/forgot", "/help", "/no-such-page"] : SITE;
      for (const path of paths) {
        await page.goto(`/en${path}`);
        await hydrated(page);
        await exercise(page);
      }
      expect(seen.errors).toEqual([]);
    });
  }
}

for (const [role, paths] of Object.entries(WORKSPACE)) {
  test(`${role}: opening every workspace page and its menus logs nothing`, async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await as(context, role as Role);
    const seen = watch(page);
    for (const path of paths) {
      await page.goto(`/en${path}`);
      await hydrated(page);
      await exercise(page);
    }
    expect(seen.errors).toEqual([]);
  });
}

test("everyday actions log nothing: search, save, message, theme, dates, language", async ({ page, context }) => {
  await as(context, "guest");
  const seen = watch(page);

  await page.goto("/en/stays");
  await hydrated(page);
  // Smart search: open, type, see suggestions, close.
  await page.getByRole("banner").getByRole("button", { name: /search/i }).first().click();
  await page.keyboard.type("2 bedrooms near the convention centre", { delay: 10 });
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");

  // Save a home and unsave it.
  const heart = page.locator("main").getByRole("button", { name: /save/i }).first();
  await heart.click();
  await page.waitForTimeout(200);
  await heart.click();

  // Pick dates on a stay.
  await page.goto("/en/stays/kimihurura-convention-studio");
  await hydrated(page);
  await page.locator("#book button[aria-haspopup=dialog]").first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");

  // Send a message with an emoji and open the location picker.
  await page.goto("/en/messages?thread=cnv_001");
  await hydrated(page);
  await page.getByLabel("Write a reply").fill(`Quick check ${Date.now()} 🙂`);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForTimeout(500);
  const location = page.getByRole("button", { name: /location/i }).first();
  if (await location.count()) {
    await location.click();
    await page.getByRole("combobox", { name: /search a place/i }).fill("KN 5 Rd");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
  }

  // Theme and language from the profile menu.
  await page.locator("button[aria-haspopup=menu]", { has: page.locator("span.sr-only") }).last().click();
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "System" }).click();
  await page.keyboard.press("Escape");
  for (const locale of ["fr", "rw", "sw"]) {
    await page.goto(`/${locale}/stays/kimihurura-convention-studio`);
    await hydrated(page);
  }

  // The change-dates dialog on a booking.
  await page.goto("/en/bookings/HL-PREL-01");
  await hydrated(page);
  await page.getByRole("button", { name: "Change dates" }).first().click();
  await page.getByRole("dialog", { name: "Change dates" }).locator("button[aria-haspopup=dialog]").first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");

  expect(seen.errors).toEqual([]);
});
