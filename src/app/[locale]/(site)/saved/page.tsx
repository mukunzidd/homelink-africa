import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { SavedList, type SavedCatalogueItem } from "@/components/saved/saved-list";
import { minutesTo } from "@/lib/domain/landmarks";
import { formatDate } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "saved" });
  return { title: t("title") };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("saved");
  const tListing = await getTranslations("listing");
  const tExp = await getTranslations("experiences");

  const r = repos();
  const tSale = await getTranslations("sale");
  const [stays, leases, sales, cars, days] = await Promise.all([
    r.stays.list(),
    r.stays.list({ band: "long" }),
    r.sales.list(),
    r.mobility.list(),
    r.experiences.list(),
  ]);
  const allStays = [...new Map([...stays, ...leases].map((l) => [l.id, l])).values()];
  const tList = await getTranslations("list");
  const intl = INTL_LOCALES[locale as Locale];
  const mins = (m: number) => tList("minutesShort", { minutes: m });

  const catalogue: SavedCatalogueItem[] = [
    ...allStays.map((l) => ({
      id: l.id,
      kind: "stay" as const,
      href: `/stays/${l.slug}`,
      name: l.name,
      line: `${l.neighbourhood} · ${tListing("bedrooms", { count: l.bedrooms })} · ${tListing("sleeps", { count: l.sleeps })}`,
      price: l.nightlyRate,
      unit: tListing("perNight"),
      image: l.images?.[0],
      seed: l.imageSeed,
      compare: {
        neighbourhood: l.neighbourhood,
        bedrooms: String(l.bedrooms),
        size: tListing("sleeps", { count: l.sleeps }),
        inspected: formatDate(l.verification.inspectedAt, intl),
        toCentre: mins(minutesTo(l.location, "cityCentre")),
        toAirport: mins(minutesTo(l.location, "airport")),
      },
    })),
    ...sales.map((h) => ({
      id: h.id,
      kind: "sale" as const,
      href: `/buy/${h.slug}`,
      name: h.name,
      line: `${h.neighbourhood} · ${tListing("bedrooms", { count: h.bedrooms })} · ${tSale("floor", { sqm: h.floorSqm })}`,
      price: h.price,
      unit: tSale("askingPrice"),
      image: h.images?.[0],
      seed: h.imageSeed,
      compare: {
        neighbourhood: h.neighbourhood,
        bedrooms: String(h.bedrooms),
        size: tSale("floor", { sqm: h.floorSqm }),
        inspected: formatDate(h.verification.inspectedAt, intl),
        toCentre: mins(minutesTo(h.location, "cityCentre")),
        toAirport: mins(minutesTo(h.location, "airport")),
      },
    })),
    ...cars.map((v) => ({
      id: v.id,
      kind: "car" as const,
      href: `/cars/${v.slug}`,
      name: v.name,
      line: tListing("seatCount", { count: v.seats }),
      price: v.dailyRate,
      unit: tListing("perDay"),
      image: v.images?.[0],
      seed: v.imageSeed,
    })),
    ...days.map((e) => ({
      id: e.id,
      kind: "experience" as const,
      href: `/experiences/${e.slug}`,
      name: e.name,
      line: tExp("duration", { count: e.durationHours }),
      price: e.pricePerPerson,
      unit: tExp("perPerson"),
      image: e.images?.[0],
      seed: e.imageSeed,
    })),
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
        <p className="max-w-[60ch] text-[15px] text-ink-2">{t("subtitle")}</p>
      </header>
      <SavedList catalogue={catalogue} />
    </div>
  );
}
