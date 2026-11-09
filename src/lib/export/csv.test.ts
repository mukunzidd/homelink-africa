import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes, and both kinds of line break", () => {
    expect(toCsv([["a,b", 'say "hi"', "one\ntwo", "one\rtwo"]])).toBe('"a,b","say ""hi""","one\ntwo","one\rtwo"');
  });

  it("turns anything a spreadsheet would run into text", () => {
    for (const v of ["=1+1", "+1", "-1", "@SUM(A1)", "\t=1", "\r=1", "  =1"]) {
      expect(toCsv([[v]]).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
    }
  });

  it("leaves ordinary text alone", () => {
    expect(toCsv([["booking.cancel", "HL-4KQ2-8M"]])).toBe("booking.cancel,HL-4KQ2-8M");
  });
});
