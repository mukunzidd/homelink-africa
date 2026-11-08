import { getLocale, getTranslations } from "next-intl/server";
import type { LeaseTerms, Listing, VerificationRecord } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { BoltIcon, KeyIcon, ShieldIcon, WifiIcon } from "@/components/ui/icons";
import {
  HighlightList,
  pickHighlights,
} from "@/components/ui/highlight-list";

/**
 * What a stay earns.
 *
 * Drawn from what is actually true of this listing rather than from a fixed
 * marketing list: the named inspection always leads, escrow appears only when
 * it applies (on a lease, the deposit appears instead), and the third slot goes to whichever amenity a guest in Kigali
 * would want confirmed. A highlight that is the same on every listing is not
 * a highlight.
 */
export async function Highlights({
  listing,
  record,
  escrowApplies,
  lease,
}: {
  listing: Listing;
  record: VerificationRecord;
  escrowApplies: boolean;
  /** On the lease view the deposit takes the slot escrow has on a stay. */
  lease?: LeaseTerms;
}) {
  const t = await getTranslations("highlight");
  const tList = await getTranslations("list");
  const locale = (await getLocale()) as Locale;

  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
  });

  const items = pickHighlights([
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
      key: "deposit",
      icon: <KeyIcon size={22} />,
      title: t("deposit"),
      body: lease ? t("depositBody", { deposit: tList("depositMonths", { count: lease.depositMonths }) }) : "",
      show: !!lease,
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
  ]);

  return <HighlightList items={items} />;
}
