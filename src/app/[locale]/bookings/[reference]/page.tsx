import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange, isIsoDate } from "@/lib/domain/dates";
import { quoteStay } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { StepSpine } from "@/components/checkout/step-spine";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { Button } from "@/components/ui/button";

/**
 * Confirmation.
 *
 * Booking details ride in the URL because nothing is persisted yet — Phase 2
 * gives this a real `booking` row and the page reads it by reference instead.
 * The reference itself is deterministic, so a reload shows the same code.
 */
export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{
    slug?: string;
    from?: string;
    to?: string;
    party?: string;
  }>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  if (!sp.slug || !isIsoDate(sp.from) || !isIsoDate(sp.to)) notFound();

  const listing = await repos().stays.bySlug(sp.slug);
  if (!listing) notFound();

  const quote = quoteStay(listing, sp.from, sp.to);
  if (!quote) notFound();

  const t = await getTranslations("confirmation");
  const tStatus = await getTranslations("status");
  const tVerify = await getTranslations("verification");
  const tSearch = await getTranslations("search");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const stayRange = formatDateRange(sp.from, sp.to, intlLocale);
  const party = Number(sp.party) || 2;

  const nextSteps = [
    t("next1"),
    ...(quote.escrowHeld ? [t("next2")] : []),
    t("next3"),
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-8">
      <StepSpine current={4} />

      <header className="flex flex-col gap-3">
        <StatusPill tone="ok" className="self-start">
          {tStatus("confirmed")}
        </StatusPill>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink">
          {t("title")}
        </h1>
        <p className="max-w-[58ch] text-lg leading-relaxed text-ink-2">
          {t("body")}
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
              {t("reference")}
            </h2>
            <p className="font-mono text-2xl font-semibold tracking-tight text-ink">
              {reference}
            </p>
            <p className="text-sm text-ink-2">{t("referenceHint")}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("whatNext")}
            </h2>
            <ol className="flex flex-col gap-2.5">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="tnum mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-surface-2 text-xs font-bold text-ink-3"
                  >
                    {index + 1}
                  </span>
                  <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* The bundle is gravity, never a gate — so these are secondary. */}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/cars">
              <Button variant="secondary">{t("addCar")}</Button>
            </Link>
            <Link href="/experiences">
              <Button variant="secondary">{t("addExperience")}</Button>
            </Link>
            <Link href="/messages">
              <Button variant="quiet">{t("openMessages")}</Button>
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <SupplyImage seed={listing.imageSeed} className="h-28 rounded-[6px]" />

          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-semibold leading-snug text-ink">
              {listing.name}
            </h2>
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
              <dt className="text-ink-3">{tSearch("guests")}</dt>
              <dd className="text-right text-ink">
                {tSearch("guestCount", { count: party })}
              </dd>
            </div>
          </dl>

          <QuoteBreakdown
            quote={quote}
            nightlyRate={listing.nightlyRate}
            className="border-t border-line pt-3"
          />
        </aside>
      </div>
    </div>
  );
}
