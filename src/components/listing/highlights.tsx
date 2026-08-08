import { getLocale, getTranslations } from "next-intl/server";
import type { Listing, VerificationRecord } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { BoltIcon, ShieldIcon, WifiIcon } from "@/components/ui/icons";

/**
 * Three things worth knowing before reading anything else.
 *
 * Drawn from what is actually true of this listing rather than from a fixed
 * marketing list: the named inspection always leads, escrow appears only when
 * it applies, and the third slot goes to whichever amenity a guest in Kigali
 * would want confirmed. A highlight that is the same on every listing is not
 * a highlight.
 */
export async function Highlights({
  listing,
  record,
  escrowApplies,
}: {
  listing: Listing;
  record: VerificationRecord;
  escrowApplies: boolean;
}) {
  const t = await getTranslations("highlight");
  const locale = (await getLocale()) as Locale;

  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
  });

  const items = [
    {
      key: "inspected",
      icon: <ShieldIcon size={22} />,
      title: t("inspected"),
      body: t("inspectedBody", { name: record.inspectorName, date: inspectedOn }),
      show: true,
    },
    {
      key: "escrow",
      icon: <ShieldIcon size={22} />,
      title: t("escrow"),
      body: t("escrowBody"),
      show: escrowApplies,
    },
    {
      key: "power",
      icon: <BoltIcon size={22} />,
      title: t("power"),
      body: t("powerBody"),
      show: listing.amenities.includes("backupPower"),
    },
    {
      key: "fibre",
      icon: <WifiIcon size={22} />,
      title: t("fibre"),
      body: t("fibreBody"),
      show: listing.amenities.includes("fibre"),
    },
  ]
    .filter((item) => item.show)
    .slice(0, 3);

  return (
    <ul className="flex flex-col divide-y divide-line-soft">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
          <span className="mt-0.5 flex-none text-ink-2">{item.icon}</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-ink">{item.title}</p>
            <p className="max-w-[58ch] text-sm leading-relaxed text-ink-2">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
