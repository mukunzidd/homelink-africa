import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addMonths, formatDate, formatMonthTitle, isIsoDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { formatMoney, multiply } from "@/lib/domain/money";
import { NUMBER_LOCALES } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { RentFlow } from "@/components/booking/rent-flow";

export async function generateMetadata() {
  const t = await getTranslations("lease");
  return { title: t("apply") };
}

/**
 * Renting a home for a year or more: details, an application, the review,
 * the agreement to sign, then the deposit and first month.
 *
 * The move-in month and the length come from the listing's panel. A month
 * before the home is free, or in the past, sends the guest back to choose.
 */
export default async function RentHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ moveIn?: string; months?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const listing = await repos().stays.bySlug(slug);
  if (!listing || !listing.monthlyRate || !listing.leaseTerms) notFound();

  const sp = await searchParams;
  const moveIn = isIsoDate(sp.moveIn) ? sp.moveIn : null;
  const months = sp.months === "24" ? 24 : 12;
  if (!moveIn || moveIn < kigaliDay() || moveIn < listing.leaseTerms.availableFrom.slice(0, 7) + "-01") {
    redirect(`/${locale}/stays/${slug}?band=long`);
  }
  const end = addMonths(moveIn, months);

  const intlLocale = INTL_LOCALES[locale as Locale];
  const numLocale = NUMBER_LOCALES[locale as Locale];
  const [tB, tLease, t, tR] = await Promise.all([
    getTranslations("breadcrumb"),
    getTranslations("lease"),
    getTranslations("booking.agreement"),
    getTranslations("booking.rent"),
  ]);
  const monthLabel = formatMonthTitle(moveIn, intlLocale);
  const rent = formatMoney(listing.monthlyRate, numLocale);
  const deposit = formatMoney(multiply(listing.monthlyRate, listing.leaseTerms.depositMonths), numLocale);
  const tIncl = await getTranslations("list");
  const includes = listing.leaseTerms.includes
    .map((k) => (tIncl.has(`included.${k}`) ? tIncl(`included.${k}`) : k))
    .join(", ");
  const day = (d: string) => formatDate(d, intlLocale, { day: "numeric", month: "long", year: "numeric" });
  const home = listing.name;
  const back = `/stays/${slug}?band=long`;
  const here = `/${locale}/stays/${slug}/rent?moveIn=${moveIn}&months=${months}`;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs trail={[{ label: tB("rent"), href: "/stays?band=long" }, { label: home, href: back }, { label: tLease("apply") }]} />
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{tLease("apply")}</h1>
      <Suspense fallback={<div className="h-96" />}>
        <RentFlow
          listing={listing}
          init={{ slug, start: moveIn, end, party: 1 }}
          monthLabel={monthLabel}
          text={{
            range: `${day(moveIn)} – ${day(end)}`,
            facts: [tR("facts", { count: months, month: monthLabel }), `${listing.neighbourhood}, ${listing.city}`],
            stages: [
              { tone: "ok", title: tR("stageFull"), when: tR("stageFullWhen") },
              { tone: "warn", title: tR("stageDeposit"), when: tR("stageDepositWhen") },
            ],
            title: home,
            image: listing.images?.[0],
            imageSeed: listing.imageSeed,
            changeHref: back,
          }}
          agreement={{
            heading: t("heading", { home }),
            dateLabel: day(kigaliDay()),
            clauses: [
              t("clauseHome", { home, area: `${listing.neighbourhood}, ${listing.city}` }),
              t("clauseTerm", { count: months, start: day(moveIn) }),
              t("clauseRent", { rent }),
              t("clauseDeposit", { deposit }),
              t("clauseIncludes", { includes }),
              t("clauseCare"),
              t("clauseRules"),
              t("clauseLaw"),
            ],
          }}
          signInHref={`/sign-in?next=${encodeURIComponent(here)}`}
        />
      </Suspense>
    </div>
  );
}
