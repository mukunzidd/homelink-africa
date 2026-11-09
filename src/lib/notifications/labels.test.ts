import { describe, expect, it } from "vitest";
import { NOTIFICATION_CATALOG as CATALOG } from "./catalog";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import rw from "../../../messages/rw.json";
import sw from "../../../messages/sw.json";

/**
 * The notification settings page names every kind the catalog has. A kind
 * added without its label (bookingCancelled was) logs a missing message on
 * a page the sweep never opens, so it is checked here instead.
 */
describe("notification settings labels", () => {
  for (const [locale, messages] of Object.entries({ en, fr, rw, sw })) {
    it(`names every kind in ${locale}`, () => {
      const labels = (messages as { notifications: { categoriesKinds: Record<string, string> } }).notifications.categoriesKinds;
      for (const kind of Object.keys(CATALOG)) expect(labels[kind], kind).toBeTruthy();
    });
  }
});
