import { expect, type BrowserContext, type Page } from "@playwright/test";

export type Role = "visitor" | "guest" | "ops" | "admin" | "driver" | "guide";

/** Act as a preview role: the cookie the server reads and the preference the client reads. */
export async function as(context: BrowserContext, role: Role, extra: Record<string, unknown> = {}) {
  const base = process.env.BASE ?? "http://localhost:3100";
  await context.addCookies([{ name: "homelink.role", value: role, url: base }]);
  await context.addInitScript(([r, x]) => localStorage.setItem("homelink.preferences", JSON.stringify({ role: r, ...x })), [role, extra] as const);
}

/** Collects console errors and page errors, ignoring the known dev-only notFound warning. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Encountered a script tag")) errors.push(m.text());
  });
  return errors;
}

/** Waits for the client to hydrate, so a click is not lost to a server-rendered button. */
export async function hydrated(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function noSidewaysScroll(page: Page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(w);
}

/** A date n days from today in Kigali, as YYYY-MM-DD. */
export function day(n: number) {
  return new Date(Date.now() + 2 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
}
