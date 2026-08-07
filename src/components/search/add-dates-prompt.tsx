import { getTranslations } from "next-intl/server";
import { CalendarIcon } from "@/components/ui/icons";

/**
 * Shown when results are being browsed without dates.
 *
 * Without dates a price can only be a nightly rate, availability counts refer
 * to nothing, and nothing is really bookable. Saying so is more honest than
 * showing numbers that quietly mean less than they appear to.
 */
export async function AddDatesPrompt() {
  const t = await getTranslations("results");

  return (
    <p className="flex items-center gap-2.5 rounded-ctl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
      <CalendarIcon size={15} className="text-ink-3" />
      {t("addDatesPrompt")}
    </p>
  );
}
