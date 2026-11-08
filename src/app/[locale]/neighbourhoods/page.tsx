import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { buildProfiles } from "@/lib/domain/neighbourhood-profile";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { Link } from "@/i18n/navigation";
import { Locator } from "@/components/neighbourhoods/locator";
import { HoodsMap } from "@/components/neighbourhoods/hoods-map";
import { MoneyText } from "@/components/ui/money-text";
import { ListHeader } from "@/components/results/list-layout";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hoods" });
  return { title: t("indexTitle") };
}

/**
 * Every neighbourhood we have inspected something in, as a place to start.
 *
 * The cards used to lead with a listing's interior photo, which said nothing
 * about the neighbourhood and repeated the listing cards elsewhere. The page
 * now leads with the city: one map of every neighbourhood, and on each card
 * a small locator of where it sits.
 */
export default async function NeighbourhoodsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hoods");
  const tPlaces = await getTranslations("places");
  const r = repos();
  const [nightly, leases, sales] = await Promise.all([r.stays.list(), r.stays.list({ band: "long" }), r.sales.list()]);
  const profiles = buildProfiles(nightly, leases, sales);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <ListHeader title={t("indexTitle")} subtitle={t("indexBody", { count: profiles.length })} />
      <HoodsMap
        label={t("mapLabel", { count: profiles.length })}
        hoods={profiles.map((p) => ({ name: p.name, slug: p.slug, centre: p.centre, places: p.stays.length + p.rentals.length + p.sales.length }))}
        className="h-[22rem] rounded-card border border-line sm:h-[26rem]"
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <li key={p.name}>
            <Link href={`/neighbourhoods/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-[border-color,box-shadow] hover:border-ink-3/40 hover:shadow-[var(--shadow-card)]">
              <Locator points={profiles} current={p.name} label={t("whereInCity", { place: p.name })} className="h-36 border-b border-line" />
              <span className="flex flex-1 flex-col gap-1.5 p-4">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[17px] font-semibold text-ink">{p.name}</span>
                  <span className="text-[12px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                </span>
                <span className="text-[13px] leading-relaxed text-ink-2">{tPlaces.has(p.name) ? tPlaces(p.name) : ""}</span>
                <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-[12px] text-ink-3">
                  {p.stayFrom && (
                    <span>{t("stayFrom")} <MoneyText amount={p.stayFrom} rounded className="font-medium text-ink-2" /></span>
                  )}
                  {p.rentals.length > 0 && <span>{t("rentCount", { count: p.rentals.length })}</span>}
                  {p.sales.length > 0 && <span>{t("saleCount", { count: p.sales.length })}</span>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
