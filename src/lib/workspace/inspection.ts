import type { ServiceKind } from "@/lib/domain/types";

/**
 * What an inspector checks, by lane. Fixed lists rather than free text so
 * two inspections of the same home can be compared point by point, and so
 * a re-inspection can say exactly which point failed last time.
 */
export const CHECKLIST: Record<ServiceKind, string[]> = {
  stay: ["matchesPhotos", "power", "backupPower", "water", "hotWater", "internet", "locks", "smokeAlarm", "cleanliness", "access"],
  car: ["documents", "insurance", "tyres", "brakes", "lights", "aircon", "interior", "spare"],
  experience: ["guideLicence", "route", "safety", "vehicle", "firstAid", "timing"],
};

export function checklistScore(service: ServiceKind, checklist: Record<string, boolean> | undefined): { passed: number; total: number } {
  const keys = CHECKLIST[service];
  return { passed: keys.filter((k) => checklist?.[k]).length, total: keys.length };
}
