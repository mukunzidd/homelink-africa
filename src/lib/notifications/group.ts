import type { AppNotification } from "@/lib/domain/types";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";

export type DayGroup = "today" | "yesterday" | "earlier";

/**
 * Today, Yesterday, Earlier, in Kigali days. Empty groups are left out, so
 * the panel never shows a heading with nothing under it.
 */
export function groupByDay(
  items: AppNotification[],
  now: Date,
): { group: DayGroup; items: AppNotification[] }[] {
  const today = kigaliDay(now);
  const yesterday = addDays(today, -1);
  const groups: Record<DayGroup, AppNotification[]> = { today: [], yesterday: [], earlier: [] };
  for (const item of items) {
    const day = kigaliDay(item.createdAt);
    groups[day === today ? "today" : day === yesterday ? "yesterday" : "earlier"].push(item);
  }
  return (["today", "yesterday", "earlier"] as const)
    .filter((g) => groups[g].length > 0)
    .map((group) => ({ group, items: groups[group] }));
}
