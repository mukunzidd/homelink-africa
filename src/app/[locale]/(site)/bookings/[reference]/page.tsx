import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { Booking, DriveMode, ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { addDays, formatDate, formatDateRange, isIsoDate } from "@/lib/domain/dates";
import { CarIcon, CompassIcon } from "@/components/ui/icons";
import { quoteExperience, quoteStay, quoteVehicle } from "@/lib/domain/pricing";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { cookies } from "next/headers";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { StepSpine } from "@/components/checkout/step-spine";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { Button } from "@/components/ui/button";
import { SignedOut } from "@/components/shell/signed-out";
import { BookingRecord } from "@/components/bookings/booking-record";
import { ManagePanel } from "@/components/bookings/manage-panel";

/**
 * One booking, at two moments in its life.
 *
 * **Just paid.** Nothing is persisted yet, so the details ride in the query
 * string and the page reconstructs the quote from them. This is the flow
 * checkout has always used and it is unchanged.
 *
 * **Come back to it.** A guest arriving from Trips has only the reference —
 * the code on their email, the one they read down a phone line — and no query
 * string at all. Until now that produced a 404, which meant the reference, the
 * escrow state and "what happens next" all lived on a page a guest could reach
 * exactly once and never again.
 *
 * The row wins when there is one. Post-checkout references are generated from
 * a seed and will not collide with a fixture, so the two paths do not fight.
 */
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const booking = await repos().bookings.byReference(reference);
  if (booking) return <BookingRecordPage booking={booking} locale={locale} />;

  return <JustBooked reference={reference} locale={locale} searchParams={searchParams} />;
}

/* ------------------------------------------------------------- the record */

async function BookingRecordPage({ booking, locale }: { booking: Booking; locale: string }) {
  // A booking is the guest's record of their own money. A visitor is most
  // likely that guest on another device, following the link in their email,
  // so they get the way in that Trips gives rather than a 404 that reads as
  // "this booking does not exist". Any other role is signed in as someone
  // who does not own it, and a guessed code still finds nothing.
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role === "visitor") return <SignedOut screen="booking" />;
  if (role !== "guest") notFound();
  const intlLocale = INTL_LOCALES[locale as Locale];
  return (
    <BookingRecord
      booking={booking}
      locale={locale}
      intlLocale={intlLocale}
      manage={<ManagePanel booking={booking} intlLocale={intlLocale} />}
    />
  );
}

/* ------------------------------------------------- straight out of checkout */

type Resolved = {
  title: string;
  subtitle: string;
  imageSeed: string;
  image?: string;
  quote: Quote;
  unitRate: Money;
  units: number;
  when: string;
  party: number;
};

async function JustBooked({
  reference,
  locale,
  searchParams,
}: {
  reference: string;
  locale: string;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
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
        image: vehicle.images?.[0],
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
        image: experience.images?.[0],
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
      image: listing.images?.[0],
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

  const tB = await getTranslations("breadcrumb");
  const tList = await getTranslations("list");
  const lane =
    kind === "car"
      ? { label: tB("cars"), href: "/cars", item: `/cars/${sp.slug}` }
      : kind === "experience"
        ? { label: tB("experiences"), href: "/experiences", item: `/experiences/${sp.slug}` }
        : { label: tB("homes"), href: "/stays", item: `/stays/${sp.slug}` };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-8">
      <Breadcrumbs
        trail={[
          { label: lane.label, href: lane.href },
          { label: resolved.title, href: lane.item },
          { label: tB("booking") },
        ]}
      />
      <StepSpine current={4} lane={kind} />

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
            <h2 className="text-xs font-medium text-ink-3">
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
                    className="tnum mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-3"
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

          {/*
            An offer, not a catalogue.
            "Add a car" sent people into an unfiltered search with none of this
            booking carried across, so it read as "go start something else"
            rather than "finish your trip". And the moment is wrong: nobody
            arranges an airport pickup three months out — they do it days
            before, when the logistics feel real.
            So this asks a person instead, and says plainly that the team will
            come back nearer the date. It is also the honest shape of the
            product today: a human arranges these, there is no second checkout
            behind them.
          */}
          {/*
            The rest of the trip, carried across. "Add a car" was removed once
            because it opened an unfiltered search with nothing from this
            booking in it. These two carry the dates and the party, so the car
            list opens on arrival to departure with totals, and the days out
            open on the first full day with the price for everyone.
          */}
          {kind !== "car" && kind !== "experience" && isIsoDate(sp.from) && isIsoDate(sp.to) && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold text-ink">{tList("tripTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/cars?from=${sp.from}&to=${sp.to}`}
                  className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink-3/40"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-surface-2 text-ink-2">
                    <CarIcon size={18} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink">{tList("tripCar")}</span>
                    <span className="text-[13px] text-ink-2">{tList("tripCarBody", { when: resolved.when })}</span>
                  </span>
                </Link>
                <Link
                  href={`/experiences?date=${addDays(sp.from, 1)}&party=${resolved.party}`}
                  className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink-3/40"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-surface-2 text-ink-2">
                    <CompassIcon size={18} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink">{tList("tripDay")}</span>
                    <span className="text-[13px] text-ink-2">
                      {tList("tripDayBody", { date: formatDate(addDays(sp.from, 1), intlLocale), count: resolved.party })}
                    </span>
                  </span>
                </Link>
              </div>
            </section>
          )}

          <section className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              {t("arrangeTitle")}
            </h2>
            <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
              {t("arrangeBody")}
            </p>
            <Link href="/messages" className="mt-1">
              <Button variant="trust">{t("arrangeAction")}</Button>
            </Link>
            <p className="text-[13px] text-ink-3">{t("arrangeNote")}</p>
          </section>
        </div>

        <aside className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <SupplyImage
            seed={resolved.imageSeed}
            src={resolved.image}
            alt={resolved.title}
            sizes="320px"
            className="h-28 rounded-inner"
          />

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
