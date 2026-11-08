import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { buildProfiles } from "@/lib/domain/neighbourhood-profile";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Locator } from "@/components/neighbourhoods/locator";
import { MoneyText } from "@/components/ui/money-text";
import { BedIcon, HouseIcon, KeyIcon, ArrowRightIcon } from "@/components/ui/icons";
import { AreaMap } from "@/components/results/stays-map";
import { TravelTimes } from "@/components/results/travel-times";
import { ListingRow } from "@/components/listing/listing-row";
import { SaleRow } from "@/components/sale/sale-row";

async function profileFor(name: string) {
  const r = repos();
  const [nightly, leases, sales] = await Promise.all([r.stays.list(), r.stays.list({ band: "long" }), r.sales.list()]);
  const all = buildProfiles(nightly, leases, sales);
  return { profile: all.find((p) => p.slug === name.toLowerCase()), all };
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const { profile } = await profileFor(name);
  return profile ? { title: `${profile.name}, Kigali` } : {};
}

/**
 * A neighbourhood as a place, not a filter.
 *
 * The footer and the landing page named neighbourhoods and then dropped the
 * visitor into a filtered list, which answers "what is for rent here" before
 * "what is it like here". This page answers the second first: a portrait, the
 * going prices for staying, renting and buying, how far it is from the places
 * people measure the city by, and only then what we have there.
 */
export default async function NeighbourhoodPage({ params }: { params: Promise<{ locale: string; name: string }> }) {
  const { locale, name } = await params;
  setRequestLocale(locale);
  const { profile: p, all } = await profileFor(name);
  if (!p) notFound();

  const t = await getTranslations("hoods");
  const tB = await getTranslations("breadcrumb");
  const tPlaces = await getTranslations("places");
  const tMap = await getTranslations("map");
  const tListing = await getTranslations("listing");
  const q = `neighbourhood=${encodeURIComponent(p.name)}`;
  // Admin's own line for the place, and whether its travel times show, from Content.
  const own = (await repos().admin.content()).neighbourhoods[p.name];

  const modes = [
    { key: "stay", icon: BedIcon, href: `/stays?${q}`, count: p.stays.length, price: p.stayFrom, label: t("stayFrom"), unit: tListing("perNight") },
    { key: "rent", icon: KeyIcon, href: `/stays?${q}&band=long`, count: p.rentals.length, price: p.rentMedian, label: t("rentTypical"), unit: tListing("perMonth") },
    { key: "buy", icon: HouseIcon, href: `/buy?${q}`, count: p.sales.length, price: p.saleFrom, label: t("buyFrom"), unit: "" },
  ] as const;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-6">
      <Breadcrumbs trail={[{ label: tB("homes"), href: "/stays" }, { label: tB("neighbourhoods"), href: "/neighbourhoods" }, { label: p.name }]} />

      <header className="grid items-end gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-ink-3">{t("district", { district: DISTRICTS[p.name] ?? "Kigali" })}</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">{p.name}</h1>
          <p className="max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
            {own?.text || <>{tPlaces.has(p.name) ? tPlaces(p.name) : ""} {t.has(`goodFor.${p.name}`) ? t(`goodFor.${p.name}`) : ""}</>}
          </p>
        </div>
        {/* The area itself, not a room in it: the hero used to be a
            listing's bedroom, which described the listing. */}
        <AreaMap label={tMap("areaLabel", { place: p.name })} area={{ lat: p.centre.lat, lng: p.centre.lng, radiusM: 900 }} className="h-64 rounded-card border border-line" />
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {modes.map((m) => {
          const Icon = m.icon;
          const body = (
            <>
              <span className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
                <Icon size={16} className="text-ink-3" />
                {t(`mode.${m.key}`, { count: m.count })}
              </span>
              {m.price ? (
                <span className="text-[13px] text-ink-3">
                  {m.label} <MoneyText amount={m.price} rounded className="text-[18px] font-semibold text-ink" /> {m.unit}
                </span>
              ) : (
                <span className="text-[13px] text-ink-3">{t("noneYet")}</span>
              )}
            </>
          );
          return (
            <li key={m.key}>
              {m.count > 0 ? (
                <Link href={m.href} className="group flex h-full flex-col gap-1.5 rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink-3/40">
                  {body}
                  <span className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-brand">
                    {t("see")} <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <div className="flex h-full flex-col gap-1.5 rounded-card border border-dashed border-line p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <figure className="flex flex-col gap-2">
          <Locator points={all} current={p.name} label={t("whereInCity", { place: p.name })} className="rounded-card border border-line" />
          <figcaption className="text-[13px] text-ink-3">{t("locatorCaption", { place: p.name, count: all.length })}</figcaption>
        </figure>
        {own?.showLandmarks !== false && <TravelTimes point={p.centre} />}
      </section>

      {p.stays.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("staysHere")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.stays.slice(0, 3).map((l) => (
              <ListingRow key={l.id} listing={l} layout="tile" />
            ))}
          </div>
        </section>
      )}

      {p.rentals.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("rentalsHere")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.rentals.slice(0, 3).map((l) => (
              <ListingRow key={l.id} listing={l} layout="tile" lease />
            ))}
          </div>
        </section>
      )}

      {p.sales.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("salesHere")}</h2>
          <div className="flex flex-col gap-3">
            {p.sales.map((h) => (
              <SaleRow key={h.id} home={h} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-[15px] font-semibold text-ink">{t("others")}</h2>
        <ul className="flex flex-wrap gap-2">
          {all.filter((o) => o.slug !== p.slug).map((o) => (
            <li key={o.slug}>
              <Link href={`/neighbourhoods/${o.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
