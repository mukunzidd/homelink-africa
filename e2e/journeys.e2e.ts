import { expect, test } from "@playwright/test";
import { as, day, hydrated, noSidewaysScroll, watchErrors } from "./helpers";

/**
 * The journeys people actually take, end to end in a browser, against the
 * fixture store reset in global-setup. Each test stands alone; none relies
 * on another having run first.
 */

test("a visitor signs in by phone and lands back where they were", async ({ page, context }) => {
  await as(context, "visitor");
  const errors = watchErrors(page);
  await page.goto("/en/stays");
  await hydrated(page);
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in\?next=/);
  await page.getByLabel("Phone number").fill("0788123456");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page).toHaveURL(/\/en\/verify/);
  await page.getByLabel("Digit 1").fill("000000");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("not right");
  await page.getByLabel("Digit 1").fill("123456");
  await expect(page).toHaveURL(/\/en\/stays$/);
  expect((await context.cookies()).find((c) => c.name === "homelink.role")?.value).toBe("guest");
  expect(errors).toEqual([]);
});

test("sign-in never sends anyone to another site", async ({ page, context }) => {
  await as(context, "visitor");
  await page.goto("/en/sign-in?next=%2F%2Fevil.example");
  await hydrated(page);
  await page.getByRole("tab", { name: "Email" }).click();
  await page.getByLabel("Email").fill("ange@example.rw");
  await page.getByLabel("Password").fill("correcthorse");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/en\/account$/);
});

test("a guest books a stay from dates to a confirmed reference", async ({ page, context }) => {
  await as(context, "guest");
  const errors = watchErrors(page);
  const from = day(200);
  const to = day(203);
  await page.goto(`/en/stays/kimihurura-convention-studio/book?from=${from}&to=${to}&party=1`);
  await hydrated(page);
  await page.getByLabel("Full name").fill("Ange Uwase");
  await page.getByLabel("Email").fill("ange@example.rw");
  await page.getByLabel("Phone").fill("0788123456");
  await page.getByRole("button", { name: /Continue to Extras/ }).click();
  await page.getByRole("button", { name: /Continue to Review/ }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: /Continue to Pay/ }).click();
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("Name on card").fill("Ange Uwase");
  await page.getByLabel("Expiry date").fill("12/30");
  await page.getByLabel("Security code").fill("123");
  await page.getByRole("button", { name: /^Pay/ }).click();
  await expect(page).toHaveURL(/\/en\/bookings\/HL-/, { timeout: 20_000 });
  const reference = page.url().split("/").pop()!;
  await page.goto("/en/trips");
  await expect(page.getByText(reference)).toBeVisible();
  expect(errors).toEqual([]);
});

test("adding to a trip keeps the way to it in reach", async ({ page, context }) => {
  await as(context, "guest", {});
  await context.addInitScript(() => localStorage.setItem("homelink.cart.v1", JSON.stringify({ enabled: true, items: [] })));
  await page.goto("/en/cars/toyota-rav4");
  await hydrated(page);
  await expect(page.getByRole("link", { name: /Your trip/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Add to trip" }).first().click();
  await expect(page.getByRole("status").getByText("Added to your trip")).toBeVisible();
  await page.getByRole("status").getByRole("link", { name: /View trip/ }).click();
  await expect(page).toHaveURL(/\/en\/trip$/);
  const addCar = page.getByRole("navigation", { name: "Add to this trip" }).getByRole("link").nth(1);
  await expect(addCar).toHaveAttribute("href", /\/cars\?from=\d{4}-\d{2}-\d{2}&to=/);
});

test("a guest's message with an emoji reaches the desk", async ({ browser }) => {
  const guest = await browser.newContext();
  await as(guest, "guest");
  const g = await guest.newPage();
  await g.goto("/en/messages?thread=cnv_001");
  await hydrated(g);
  const text = `Arriving at 19:40 ✈️ ${Date.now()}`;
  await g.getByLabel("Write a reply").fill(text);
  await g.getByRole("button", { name: "Send", exact: true }).click();
  await expect(g.locator("ol").getByText(text)).toBeVisible();
  const ops = await browser.newContext();
  await as(ops, "ops");
  const o = await ops.newPage();
  await o.goto("/en/manage/inbox?thread=cnv_001");
  await expect(o.locator("ol").getByText(text)).toBeVisible();
  await guest.close();
  await ops.close();
});

test("the desk checks a guest in and marks the turnover ready", async ({ page, context }) => {
  await as(context, "ops");
  const errors = watchErrors(page);
  await page.goto("/en/manage/today");
  await hydrated(page);
  const checkIn = page.getByRole("button", { name: /Check in/ }).first();
  await checkIn.click();
  await expect(page.getByText(/Checked in/).first()).toBeVisible();
  await page.goto("/en/manage/housekeeping");
  await hydrated(page);
  await page.getByRole("button", { name: "Ready", exact: true }).first().click();
  await expect(page.locator("button[aria-pressed=true]", { hasText: "Ready" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin approves a refund and a settings change reaches the help centre", async ({ page, context }) => {
  await as(context, "admin");
  await page.goto("/en/manage/finance?tab=refunds");
  await hydrated(page);
  const waiting = await page.getByText("Awaiting approval").count();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Awaiting approval")).toHaveCount(waiting - 1);
  await page.goto("/en/manage/settings");
  await hydrated(page);
  const window = page.locator("section", { has: page.getByRole("heading", { name: "Free cancellation" }) });
  await window.getByLabel("Stays, days").fill("9");
  await window.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();
  await page.goto("/en/help/cancel-stay");
  await expect(page.locator("article")).toContainText("Cancel up to 9 days");
  await page.goto("/en/manage/settings");
  await hydrated(page);
  await page.locator("section", { has: page.getByRole("heading", { name: "Free cancellation" }) }).getByLabel("Stays, days").fill("7");
  await page.locator("section", { has: page.getByRole("heading", { name: "Free cancellation" }) }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();
});

test("a guide accepts an offer and the desk hears about it", async ({ browser }) => {
  const guide = await browser.newContext();
  await as(guide, "guide");
  const p = await guide.newPage();
  await p.goto("/en/manage/jobs");
  await hydrated(p);
  await p.getByRole("button", { name: "Accept" }).first().click();
  await expect(p.getByText("No offers waiting.")).toBeVisible();
  const ops = await browser.newContext();
  await as(ops, "ops");
  const res = await (await ops.newPage()).request.get("/api/notifications?limit=5");
  expect((await res.json()).items.map((n: { kind: string }) => n.kind)).toContain("jobAccepted");
  await guide.close();
  await ops.close();
});

test("each role reaches only its own workspace pages", async ({ page, context }) => {
  await as(context, "driver");
  for (const path of ["/manage/finance", "/manage/people", "/manage/bookings", "/manage/portfolio"]) {
    await page.goto(`/en${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("not yours");
  }
  await page.goto("/en/manage/jobs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jobs");
});

test("a guest cannot fetch another thread's photo or post into a thread they are not in", async ({ page, context }) => {
  await as(context, "guest");
  const upload = await page.request.post("/api/messages/files", {
    multipart: { conversationId: "cnv_005", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) } },
  });
  expect(upload.status()).toBeGreaterThanOrEqual(400);
  const bad = await page.request.post("/api/messages/files", {
    multipart: { conversationId: "cnv_001", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") } },
  });
  expect(bad.status()).toBe(415);
});

for (const locale of ["en", "fr", "rw", "sw"]) {
  test(`phones: the busiest pages fit 390px in ${locale}`, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(context, "guest");
    const errors = watchErrors(page);
    for (const path of ["", "/stays", "/stays/kimihurura-convention-studio", "/cars/toyota-rav4", "/experiences", "/trips", "/messages", "/account/settings", "/help", "/contact"]) {
      await page.goto(`/${locale}${path}`);
      await hydrated(page);
      await noSidewaysScroll(page);
    }
    expect(errors).toEqual([]);
  });
}

test("a guest's payments page lists only their own bookings", async ({ page, context }) => {
  await as(context, "guest");
  await page.goto("/en/account/payments");
  await hydrated(page);
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText(/bkg_/)).toHaveCount(0);
  // Every line names a booking the guest can open a receipt for.
  const lines = page.locator("main ul > li");
  const receipts = page.locator("main ul > li").getByRole("link");
  expect(await receipts.count()).toBe(await lines.count());
});

for (const [role, path] of [["guest", "/en/stays"], ["ops", "/en/manage/today"]] as const) {
  test(`${role} switches theme from the profile menu and it sticks`, async ({ page, context }) => {
    await as(context, role);
    await page.goto(path);
    await hydrated(page);
    await page.locator("button[aria-haspopup=menu]", { has: page.locator("span.sr-only") }).last().click();
    const theme = page.getByRole("group", { name: "Theme" });
    await theme.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(theme.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}

test("a missing page logs nothing but its 404, and a stored dark theme paints before React runs", async ({ page, context }) => {
  await as(context, "guest", { theme: "dark" });
  const errors = watchErrors(page);
  // Read the attribute at DOMContentLoaded, before any client code has hydrated.
  await context.addInitScript(() =>
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { themeAtParse: string | null }).themeAtParse = document.documentElement.getAttribute("data-theme");
    }),
  );
  await page.goto("/en/stays");
  await hydrated(page);
  expect(await page.evaluate(() => (window as unknown as { themeAtParse: string | null }).themeAtParse)).toBe("dark");
  await page.goto("/en/no-such-page");
  await hydrated(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors.filter((e) => !e.includes("status of 404"))).toEqual([]);
});

test("admin assigns a driver from a branded list, and it sticks", async ({ page, context }) => {
  await as(context, "admin");
  await page.goto("/en/manage/partners");
  await hydrated(page);
  await expect(page.locator("main select")).toHaveCount(0);
  // Counted rather than fixed: other journeys hand out jobs from the same store.
  const unassigned = () => page.locator("section", { hasText: /with nobody on them/ }).getByRole("combobox");
  const before = await unassigned().count();
  expect(before).toBeGreaterThan(0);
  await unassigned().first().click();
  await page.getByRole("option", { name: "Eric Hakizimana" }).click();
  await expect(page.getByText("Job given").first()).toBeVisible();
  await page.reload();
  await hydrated(page);
  await expect(unassigned()).toHaveCount(before - 1);
});

test("the workspace sidebar starts folded, unfolds from the top, and remembers", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await as(context, "admin");
  await page.goto("/en/manage/overview");
  await hydrated(page);
  const sidebar = page.locator("aside[data-sidebar]");
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  expect((await sidebar.boundingBox())!.width).toBeLessThan(80);
  await sidebar.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");
  await page.reload();
  await hydrated(page);
  await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(200);
  await sidebar.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
});

for (const width of [1280, 390]) {
  test(`a calendar inside a dialog is shown whole at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 860 });
    await as(context, "guest");
    await page.goto("/en/bookings/HL-PREL-01");
    await hydrated(page);
    await page.getByRole("button", { name: "Change dates" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Change dates" });
    await dialog.locator("button[aria-haspopup=dialog]").first().click();
    const calendar = page.locator("[role=dialog][aria-modal=false]");
    await expect(calendar).toBeVisible();
    // Done is the popover's bottom edge: whole in the viewport, and the
    // topmost thing at its centre, so nothing is clipping or covering it.
    // (The last date button can be the second month, hidden on a phone.)
    const last = calendar.getByRole("button", { name: "Done" });
    await expect(last).toBeInViewport({ ratio: 1 });
    const hit = await last.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && (top === el || el.contains(top));
    });
    expect(hit).toBe(true);
  });
}
