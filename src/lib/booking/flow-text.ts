import { getTranslations } from "next-intl/server";
import type { ServiceKind } from "@/lib/domain/types";
import { addDays, formatDate, formatDateRange, nightsBetween, type IsoDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import type { FlowText } from "@/components/booking/types";

/**
 * The sentences and dates the booking flow shows, formatted on the server.
 * See FlowText for why they cannot be formatted in the browser too.
 */
export async function flowPolicy(
  service: ServiceKind,
  start: IsoDate,
  end: IsoDate,
  intlLocale: string,
  opts: { requiresPermit?: boolean } = {},
): Promise<Pick<FlowText, "range" | "stages" | "stageNote" | "freeLine" | "depositDue">> {
  const t = await getTranslations("booking");
  const today = kigaliDay();
  const day = (d: IsoDate) => formatDate(d, intlLocale, { day: "numeric", month: "short", year: "numeric" });
  const until = (d: IsoDate) => t("review.cancelUntil", { date: day(d) });
  const from = (d: IsoDate) => t("review.cancelFrom", { date: day(d) });

  let stages: FlowText["stages"] = [];
  let free: IsoDate | null = null;
  if (service === "stay") {
    free = addDays(start, -7);
    stages = [
      { tone: "ok", title: t("review.cancelFull"), when: until(free) },
      { tone: "warn", title: t("review.cancelHalf"), when: until(addDays(start, -1)) },
      { tone: "crit", title: t("review.cancelNone"), when: from(start) },
    ];
  } else if (service === "car") {
    free = addDays(start, -2);
    stages = [
      { tone: "ok", title: t("review.cancelCarFree"), when: until(free) },
      { tone: "warn", title: t("review.cancelCarOneDay"), when: from(addDays(start, -1)) },
    ];
  } else {
    free = addDays(start, -3);
    stages = [
      {
        tone: "ok",
        // Where the price is mostly a permit, "full refund" would be untrue.
        title: opts.requiresPermit ? t("review.cancelDayPermit") : t("review.cancelDayFree"),
        when: until(free),
      },
      { tone: "crit", title: t("review.cancelDayNone"), when: from(addDays(start, -2)) },
    ];
  }
  // A window that has already closed is not a stage any more.
  const open = free >= today;
  if (!open) stages = stages.slice(1);

  return {
    range:
      service === "experience" || nightsBetween(start, end) < 1
        ? day(start)
        : formatDateRange(start, end, intlLocale),
    stages,
    stageNote: opts.requiresPermit ? t("review.cancelPermit") : undefined,
    freeLine: open ? t("summary.free", { date: day(free) }) : undefined,
    depositDue: day(addDays(start, -14)),
  };
}
