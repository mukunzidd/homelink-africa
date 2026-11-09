import type { LandingData } from "../data";
import arrival from "./arrival";
import report from "./report";
import hills from "./hills";
import magazine from "./magazine";
import concierge from "./concierge";

/**
 * Five whole-page candidates for the home page, each built on its own idea
 * rather than a different hero photo. Compared at /preview/landing.
 */
export const DESIGNS: Record<string, (p: { locale: string; data: LandingData }) => Promise<React.ReactNode>> = {
  arrival,
  report,
  hills,
  magazine,
  concierge,
};
export const DESIGN_KEYS = Object.keys(DESIGNS);
