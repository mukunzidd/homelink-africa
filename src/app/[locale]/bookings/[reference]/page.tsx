import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { DriveMode, ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { formatDate, formatDateRange, isIsoDate } from "@/lib/domain/dates";
import { quoteExperience, quoteStay, quoteVehicle } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { StepSpine } from "@/components/checkout/step-spine";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { Button } from "@/components/ui/button";

/**
 * Confirmation, for all three modules.
 *
 * Details ride in the URL because nothing is persisted yet — Phase 2 gives
 * this a real `booking` row and the page reads it by reference instead. The
 * reference is deterministic, so a reload shows the same code.
 */
type Resolved = {
  title: string;
  subtitle: string;
  imageSeed: string;
  quote: Quote;
  unitRate: Money;
  units: number;
  when: string;
  party: number;
};

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  if (!sp.slug) notFound();

  const intlLocale = INTL_LOCALES[locale as Locale];
  const kind = (sp.kind ?? "stay") as ServiceKind;
  const party = Number(sp.party) || 2;

  const resolved = await resolve();
  if (!resolved) notFound();

  async function resolve(): Promise<Resolved | null> {
    if (kind === "car") {
      const vehicle = await repos().mobility.bySlug(sp.slug!);
      if (!vehicle || !isIsoDate(sp.from) || !isIsoDate(sp.to)) return null;
      const driveMode = (sp.driveMode ?? "selfDrive") as DriveMode;
      const quote = quoteVehicle(vehicle, sp.from, sp.to, driveMode);
      if (!quote) return null;
      return {
        title: vehicle.name,
        subtitle: vehicle.summary,
        imageSeed: vehicle.imageSeed,
        quote,
        unitRate: vehicle.dailyRate,
        units: quote.nights,
        when: formatDateRange(sp.from, sp.to, intlLocale),
        party,
      };
    }

    if (kind === "experience") {
      const experience = await repos().experiences.bySlug(sp.slug!);
      if (!experience || !isIsoDate(sp.date)) return null;
      const quote = quoteExperience(experience, party);
      if (!quote) return null;
      return {
        title: experience.name,
        subtitle: experience.meetingPoint,
        imageSeed: experience.imageSeed,
        quote,
        unitRate: experience.pricePerPerson,
        units: party,
        when: formatDate(sp.date, intlLocale),
        party,
      };
    }

    const listing = await repos().stays.bySlug(sp.slug!);
    if (!listing || !isIsoDate(sp.from) || !isIsoDate(sp.to)) return null;
    const quote = quoteStay(listing, sp.from, sp.to);
    if (!quote) return null;
    return {
      title: listing.name,
      subtitle: `${listing.neighbourhood} · ${listing.city}`,
      imageSeed: listing.imageSeed,
      quote,
      unitRate: listing.nightlyRate,
      units: quote.nights,
      when: formatDateRange(sp.from, sp.to, intlLocale),
      party,
    };
  }

  const t = await getTranslations("confirmation");
  const tStatus = await getTranslations("status");
  const tVerify = await getTranslations("verification");
  const tSearch = await getTranslations("search");

  const nextSteps = [
    t("next1"),
    ...(resolved.quote.escrowHeld ? [t("next2")] : []),
    t("next3"),
  ];

  // Add-ons offered are the ones not already booked — suggesting a car to
  // someone who just booked a car is noise, and Principle 3 says the bundle
  // pulls toward a richer trip without ever getting in the way.
  const addOns = [
    { href: "/cars", label: t("addCar"), show: kind !== "car" },
    {
      href: "/experiences",
      label: t("addExperience"),
      show: kind !== "experience",
    },
  ].filter((a) => a.show);

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
            {addOns.map((addOn) => (
              <Link key={addOn.href} href={addOn.href}>
                <Button variant="secondary">{addOn.label}</Button>
              </Link>
            ))}
            <Link href="/messages">
              <Button variant="quiet">{t("openMessages")}</Button>
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <SupplyImage seed={resolved.imageSeed} className="h-28 rounded-[6px]" />

          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-semibold leading-snug text-ink">
              {resolved.title}
            </h2>
            <p className="line-clamp-2 text-[13px] text-ink-3">
              {resolved.subtitle}
            </p>
          </div>

          <VerifiedBadge label={tVerify("badge")} size="sm" className="self-start" />

          <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tSearch("when")}</dt>
              <dd className="tnum text-right text-ink">{resolved.when}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tSearch("guests")}</dt>
              <dd className="text-right text-ink">
                {tSearch("guestCount", { count: resolved.party })}
              </dd>
            </div>
          </dl>

          <QuoteBreakdown
            quote={resolved.quote}
            unitRate={resolved.unitRate}
            units={resolved.units}
            className="border-t border-line pt-3"
          />
        </aside>
      </div>
    </div>
  );
}
