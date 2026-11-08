import { getTranslations } from "next-intl/server";
import type { GeoPoint } from "@/lib/domain/types";
import { LANDMARK_KEYS, minutesTo } from "@/lib/domain/landmarks";
import { FlagIcon } from "@/components/ui/icons";

/**
 * How far it is from the places a newcomer measures Kigali by. Estimated by
 * car on a weekday, and labelled as such: this is a sense of the city, not a
 * route plan.
 */
export async function TravelTimes({ point }: { point: GeoPoint }) {
  const t = await getTranslations("list");
  const tLandmark = await getTranslations("landmarks");
  const rows = LANDMARK_KEYS.map((k) => ({ k, minutes: minutesTo(point, k) })).sort((a, b) => a.minutes - b.minutes);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold text-ink">{t("travelTitle")}</h3>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map(({ k, minutes }) => (
          <li key={k} className="flex items-center justify-between gap-3 border-b border-line-soft py-1.5 text-[14px]">
            <span className="flex items-center gap-2 text-ink-2">
              <FlagIcon size={14} className="text-ink-3" />
              <span className="first-letter:uppercase">{tLandmark(k)}</span>
            </span>
            <span className="tnum text-ink">{t("minutesShort", { minutes })}</span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-3">{t("travelNote")}</p>
    </div>
  );
}
