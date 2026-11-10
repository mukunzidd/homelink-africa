import type { LandingData } from "../data";
import arrival from "./arrival";
import report from "./report";
import hills from "./hills";
import magazine from "./magazine";
import concierge from "./concierge";
import doors from "./doors";
import board from "./board";
import wall from "./wall";

/**
 * Six whole-page candidates for the home page, each built on its own idea
 * rather than a different hero photo. Compared at /preview/landing.
 */
export const DESIGNS: Record<string, (p: { locale: string; data: LandingData }) => Promise<React.ReactNode>> = {
  arrival,
  report,
  hills,
  magazine,
  concierge,
  doors,
};
export const DESIGN_KEYS = Object.keys(DESIGNS);

/**
 * Two experiments, asked for as a break from the six: each drops the usual
 * page of sections for one idea that carries the whole first screen. Shown
 * in their own group so nobody reads them as finished candidates.
 */
export const EXPERIMENTS: typeof DESIGNS = { board, wall };
export const EXPERIMENT_KEYS = Object.keys(EXPERIMENTS);
