import { getTranslations } from "next-intl/server";
import type { LandmarkKey } from "@/lib/domain/landmarks";
import { RouteIcon } from "@/components/ui/icons";

/** "15 min to the convention centre", the way a newcomer measures Kigali. */
export async function TravelTime({ minutes, landmark }: { minutes: number; landmark: LandmarkKey }) {
  const t = await getTranslations("list");
  const tLandmark = await getTranslations("landmarks");
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
      <RouteIcon size={14} className="text-ink-3" />
      {t("minutesTo", { minutes, place: tLandmark(landmark) })}
    </p>
  );
}
