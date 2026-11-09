import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { money } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { Gallery } from "@/components/ui/gallery";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ViewTracker } from "@/components/ui/view-tracker";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { SaveButton } from "@/components/ui/save-button";
import { ShareButton } from "@/components/ui/share-button";
import { AmenityIcon } from "@/components/listing/amenity-icon";
import { InspectorRow } from "@/components/listing/inspector-row";
import { VerificationRecordPanel } from "@/components/listing/verification-record";
import { AreaMap } from "@/components/results/stays-map";
import { TravelTimes } from "@/components/results/travel-times";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { BuyingFromAbroad } from "@/components/sale/buying-from-abroad";
import { RwfFigure } from "@/components/sale/rwf-figure";
import { EnquiryPanel } from "@/components/sale/enquiry-panel";
import { ShieldIcon } from "@/components/ui/icons";
import { MoneyText } from "@/components/ui/money-text";
import { AREA_RADIUS_M } from "@/lib/places/area";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const home = await repos().sales.bySlug(slug);
  return home ? { title: `${home.name}, ${home.neighbourhood}`, description: home.summary } : {};
}

export default async function SaleDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const home = await repos().sales.bySlug(slug);
  if (!home) notFound();

  const t = await getTranslations("sale");
  const tB = await getTranslations("breadcrumb");
  const tVerify = await getTranslations("verification");
  const tAmenities = await getTranslations("amenities");
  const tMap = await getTranslations("map");
  const tPlaces = await getTranslations("places");
  const tList = await getTranslations("list");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const perSqm = money(Math.round(home.price.minor / home.floorSqm), home.price.currency);

  const facts = [
    { label: t("bedroomsLabel"), value: String(home.bedrooms), key: "bed" },
    { label: t("bathroomsLabel"), value: String(home.bathrooms), key: "bath" },
    { label: t("floorLabel"), value: `${home.floorSqm} m²`, key: "floor" },
    // An apartment has no plot; price per square metre takes the cell, so the
    // grid stays whole and the buyer still gets a sixth fact worth having.
    home.plotSqm
      ? { label: t("plotLabel"), value: `${home.plotSqm.toLocaleString("en")} m²`, key: "plot" }
      : { label: t("perSqmLabel"), value: null, money: perSqm, key: "persqm" },
    { label: t("kindLabel"), value: t(`kind.${home.kind}`), key: "kind" },
    { label: t("listedLabel"), value: formatDate(home.listedAt, intlLocale), key: "listed" },
    { label: tList("yearBuilt"), value: String(home.yearBuilt), key: "year" },
    // Masked: enough to show the parcel exists and was checked, not enough
    // to look the owner up before a viewing.
    { label: tList("upi"), value: `${home.upi.split("/").slice(0, 3).join("/")}/••/••${home.upi.slice(-2)}`, key: "upi" },
    { label: tList("inspectedFact"), value: formatDate(home.verification.inspectedAt, intlLocale), key: "inspected" },
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <ViewTracker href={`/buy/${home.slug}`} name={home.name} kind="sale" image={home.images?.[0]} />
      <Breadcrumbs
        trail={[
          { label: tB("homes"), href: "/stays" },
          { label: tB("buy"), href: "/buy" },
          { label: home.neighbourhood, href: `/buy?neighbourhood=${encodeURIComponent(home.neighbourhood)}` },
          { label: home.name },
        ]}
      />

      <header className="flex flex-col gap-3">
        <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {home.name}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <VerifiedBadge label={tVerify("badge")} size="sm" />
            {home.titleChecked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-ink-2">
                <ShieldIcon size={12} className="text-brand" />
                {t("titleChecked")}
              </span>
            )}
            <span className="text-[15px] text-ink-2">
              {home.neighbourhood} · {home.city}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton title={home.name} />
            <SaveButton id={home.id} kind="sale" name={home.name} variant="inline" />
          </div>
        </div>
      </header>

      <Gallery seed={home.imageSeed} images={home.images} alt={home.name} verifiedLabel={tVerify("badge")} />

      <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col">
          <section className="flex flex-col gap-4 pb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{t(`kind.${home.kind}`)} · {home.neighbourhood}</h2>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.key} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                  <dt className="text-[12px] text-ink-3">{f.label}</dt>
                  <dd className="tnum text-[15px] font-semibold text-ink">
                    {"money" in f && f.money ? <MoneyText amount={f.money} rounded /> : f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="border-t border-line py-6">
            <InspectorRow record={home.verification} />
          </div>

          <section className="flex flex-col gap-3 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{t("about")}</h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">{home.summary}</p>
          </section>

          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{tAmenities("label")}</h2>
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {home.amenities.map((a) => (
                <li key={a} className="flex items-center gap-3.5 text-[15px] text-ink">
                  <AmenityIcon amenity={a} className="flex-none text-ink-2" />
                  {tAmenities(a)}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 border-t border-line py-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-semibold text-ink">{tMap("whereTitle")}</h2>
              <p className="text-[15px] text-ink-2">
                {home.neighbourhood}, {DISTRICTS[home.neighbourhood] ?? home.city} · {home.city}
              </p>
            </div>
            <AreaMap
              label={tMap("areaLabel", { place: home.neighbourhood })}
              area={{ lat: home.location.lat, lng: home.location.lng, radiusM: AREA_RADIUS_M }}
              className="h-72 rounded-card border border-line"
            />
            <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
              {tPlaces.has(home.neighbourhood) ? `${tPlaces(home.neighbourhood)} ` : ""}
              {t("areaNote")}
            </p>
            <TravelTimes point={home.location} />
          </section>

          <div className="border-t border-line py-6">
            <VerificationRecordPanel record={home.verification} escrowApplies={false} kind="sale" />
          </div>

          {/* What happens after the enquiry, so "ask the team" is not a black box. */}
          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{t("howTitle")}</h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {(["viewing", "papers", "notary"] as const).map((step, i) => (
                <li key={step} className="flex flex-col gap-2">
                  <span className="tnum grid size-8 place-items-center rounded-full border border-brand/30 bg-brand-tint text-[14px] font-semibold text-brand-deep">
                    {i + 1}
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink">{t(`how.${step}Title`)}</h3>
                  <p className="text-[14px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside id="enquire" className="scroll-mt-[calc(var(--header-offset)+1rem)] lg:sticky lg:top-24">
          <EnquiryPanel price={home.price} perSqm={perSqm} slug={home.slug} />
        </aside>
      </div>

      <BuyingFromAbroad />

      <MobileActionBar target="enquire" cta={t("enquireShort")}>
        <span className="text-[16px] font-semibold text-ink">
          <MoneyText amount={home.price} rounded />
        </span>
        <RwfFigure amount={home.price} className="text-[12px] text-ink-3" />
      </MobileActionBar>
    </div>
  );
}
