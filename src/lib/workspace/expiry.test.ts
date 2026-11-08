import { describe, expect, it } from "vitest";
import { expiryState } from "./expiry";

describe("expiryState", () => {
  const today = "2026-11-08";
  it("is valid with 31 days left", () => expect(expiryState("2026-12-09", today)).toBe("valid"));
  it("is expiring soon with 30 days left", () => expect(expiryState("2026-12-08", today)).toBe("expiringSoon"));
  it("is expiring soon with 1 day left", () => expect(expiryState("2026-11-09", today)).toBe("expiringSoon"));
  it("is expired on the day itself", () => expect(expiryState("2026-11-08", today)).toBe("expired"));
  it("is expired after", () => expect(expiryState("2026-11-01", today)).toBe("expired"));
});
