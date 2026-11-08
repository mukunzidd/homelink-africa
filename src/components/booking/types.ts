import type { Experience, Listing, Vehicle } from "@/lib/domain/types";

/** What is being booked, as the server hands it to the flow. */
export type FlowSupply =
  | { kind: "stay"; item: Listing }
  | { kind: "car"; item: Vehicle }
  | { kind: "experience"; item: Experience };

/**
 * Every date and sentence the flow shows that depends on a locale's date
 * format, formatted once on the server. Formatting dates in the browser as
 * well fails hydration: Node and Chrome ship different ICU data (see the
 * search-and-polish spec, "Measured on the way").
 */
export type FlowText = {
  /** "1 – 5 Dec 2026" */
  range: string;
  /** Short facts under the title: party, nights, driver… */
  facts: string[];
  /** The cancellation rules for these dates, in order. */
  stages: { tone: "ok" | "warn" | "crit"; title: string; when: string }[];
  stageNote?: string;
  /** "Free cancellation until 24 Nov", when there is a free window. */
  freeLine?: string;
  /** Balance date for the deposit plan, formatted. */
  depositDue?: string;
  image?: string;
  imageSeed: string;
  title: string;
  changeHref: string;
};
