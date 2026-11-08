import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import {
  addDays,
  formatDate,
  formatDateRange,
  isIsoDate,
  today,
} from "@/lib/domain/dates";
import { quoteStay } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StepSpine } from "@/components/checkout/step-spine";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SummaryRow } from "@/components/checkout/summary-row";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; party?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = await repos().stays.bySlug(slug);
  if (!listing) notFound();

  const sp = await searchParams;

  // Dates come from the URL so the step is shareable and survives a refresh.
  // Anything unusable sends the user back to pick dates rather than guessing
  // on their behalf — a wrong date here costs real money.
  const from = isIsoDate(sp.from) ? sp.from : null;
  const to = isIsoDate(sp.to) ? sp.to : null;
  if (!from || !to) redirect(`/${locale}/stays/${slug}`);

  const quote = quoteStay(listing, from, to);
  if (!quote) redirect(`/${locale}/stays/${slug}`);

  const parsedParty = Number(sp.party);
  const party =
    Number.isInteger(parsedParty) && parsedParty >= 1 && parsedParty <= listing.sleeps
      ? parsedParty
      : 2;

  const t = await getTranslations("checkout");
  const tB = await getTranslations("breadcrumb");
  const tSearch = await getTranslations("search");
  const tListing = await getTranslations("listing");
  const tVerify = await getTranslations("verification");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const stayRange = formatDateRange(from, to, intlLocale);

  // Free cancellation until a week before arrival, or today if that has passed.
  const cancelFrom = addDays(from, -7);
  const cancellationDate = formatDate(
    cancelFrom < today() ? today() : cancelFrom,
    intlLocale,
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <Breadcrumbs
        trail={[
          { label: tB("homes"), href: "/stays" },
          { label: tB("stay"), href: "/stays" },
          { label: listing.name, href: `/stays/${listing.slug}` },
          { label: tB("book") },
        ]}
      />
      <StepSpine current={3} lane="stay" />

      <h1 className="font-display text-3xl font-semibold text-ink">
        {t("title")}
      </h1>

      <SummaryRow
        imageSeed={listing.imageSeed}
        image={listing.images?.[0]}
        title={listing.name}
        facts={[stayRange, tSearch("guestCount", { count: party })]}
        changeHref={`/stays/${listing.slug}`}
        changeLabel={t("changeDates")}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm
          item={{
            kind: "stay",
            id: listing.id,
            slug: listing.slug,
            name: listing.name,
            unitRate: listing.nightlyRate,
          }}
          quote={quote}
          units={quote.nights}
          detailHref={`/stays/${listing.slug}`}
          confirmQuery={{ slug: listing.slug, from, to, party: String(party) }}
          referenceSeed={`${listing.id}:${from}:${to}:${party}`}
          cancellationNote={t("cancellation", { date: cancellationDate })}
        />

        {/* Below lg the summary row above stands in for this card, which would
            otherwise arrive after the Pay button. */}
        <aside className="hidden flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-20 lg:flex">
          <h2 className="text-xs font-medium text-ink-3">
            {t("summaryTitle.stay")}
          </h2>

          <SupplyImage
            seed={listing.imageSeed}
            src={listing.images?.[0]}
            alt={listing.name}
            sizes="320px"
            className="h-28 rounded-inner"
          />

          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              {listing.name}
            </h3>
            <p className="text-[13px] text-ink-3">
              {listing.neighbourhood} · {listing.city}
            </p>
          </div>

          <VerifiedBadge label={tVerify("badge")} size="sm" className="self-start" />

          <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tSearch("when")}</dt>
              <dd className="tnum text-right text-ink">{stayRange}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tListing("nightsTotal", { count: quote.nights })}</dt>
              <dd className="text-right text-ink">
                {tSearch("guestCount", { count: party })}
              </dd>
            </div>
          </dl>

          <Link
            href={`/stays/${listing.slug}`}
            className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("changeDates")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
