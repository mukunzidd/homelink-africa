import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { supplyRefFor } from "@/lib/repos/supply-ref";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { Booking, ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import { money, sum } from "@/lib/domain/money";
import { formatDate, today } from "@/lib/domain/dates";
import { ROLE_COOKIE, parseRole, supplyLaneFor } from "@/lib/preferences/role";
import { BookingRow } from "@/components/bookings/booking-row";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inventory");
  return { title: t("metaTitle") };
}

/**
 * One shell for host, driver and guide.
 *
 * Their journey has the same shape — I list a thing, it gets booked, I get
 * paid — so the page has the same three sections in the same order for all
 * three. What changes is the noun in the headings and the two columns on an
 * inventory row: what the thing *is* (bedrooms, gearbox, hours) and what it
 * costs (per night, per day, per person). Everything else is shared, and if a
 * real difference turns up it belongs in the milestone document before it
 * belongs in a fork of this file.
 *
 * The lane is chosen from the role cookie on the server, so a driver's HTML
 * never contains a host's rows. See `lib/preferences/role.ts`.
 */
type InventoryItem = {
  id: string;
  name: string;
  /** Column one: what the thing is. */
  detail: string;
  /** Column two: what it earns, and per what. */
  rate: Money;
  rateLabel: string;
  href: string;
  imageSeed: string;
  image?: string;
  inspectedAt: string;
  /** Only stays and vehicles have countable units; a day out has seats. */
  availability?: string;
};

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("inventory");
  const tListing = await getTranslations("listing");
  const tCars = await getTranslations("cars");
  const tExp = await getTranslations("experiences");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  const lane = supplyLaneFor(role);

  if (!lane) {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("notYours")}
        </h1>
        <p className="max-w-[56ch] text-ink-2">{t("notYoursBody")}</p>
        <Link
          href="/"
          className="mt-2 self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
        >
          ← HomeLink
        </Link>
      </div>
    );
  }

  const items = await itemsFor(lane);

  const bookings = (await repos().bookings.listForCurrentUser()).filter(
    (b) => b.service === lane,
  );
  const now = today();
  const upcoming = bookings
    .filter((b) => b.endDate >= now && b.status !== "cancelled")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const settled = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  // All supply is paid in RWF, which is the whole reason prices are stored in
  // the currency the supplier is actually paid in. Display conversion happens
  // in MoneyText, never here.
  const held = sum(
    upcoming.filter((b) => b.escrowHeld).map((b) => b.total),
    "RWF",
  );
  const due = sum(
    upcoming.filter((b) => !b.escrowHeld).map((b) => b.total),
    "RWF",
  );
  const paid = sum(settled.map((b) => b.total), "RWF");

  const rows = await Promise.all(
    upcoming.map(async (booking) => renderBooking(booking, false)),
  );
  const settledRows = await Promise.all(
    settled.map(async (booking) => renderBooking(booking, true)),
  );

  async function renderBooking(booking: Booking, muted: boolean) {
    const [supply, conversation] = await Promise.all([
      supplyRefFor(booking),
      repos().messaging.forBooking(booking.id, role),
    ]);
    return (
      <BookingRow
        key={booking.id}
        booking={booking}
        supply={supply}
        conversation={conversation}
        locale={intlLocale}
        muted={muted}
        aside={
          // The supplier's column. A guest wants to know their money is safe;
          // a supplier wants to know when it stops being safe and becomes
          // theirs. Same field, opposite reading.
          <p className="text-[13px] text-ink-3">
            {booking.status === "completed"
              ? t("payoutSettled")
              : booking.escrowHeld
                ? t("payoutAfterCheckIn")
                : t("payoutOnStart")}
          </p>
        }
      />
    );
  }

  async function itemsFor(kind: ServiceKind): Promise<InventoryItem[]> {
    if (kind === "car") {
      const vehicles = await repos().mobility.list();
      return vehicles.map((v) => ({
        id: v.id,
        name: v.name,
        detail: [
          tCars(`class.${v.vehicleClass}`),
          tCars(`transmission.${v.transmission}`),
          tCars("seats", { count: v.seats }),
        ].join(" · "),
        rate: v.dailyRate,
        rateLabel: tListing("perDay"),
        href: `/cars/${v.slug}`,
        imageSeed: v.imageSeed,
        image: v.images?.[0],
        inspectedAt: v.verification.inspectedAt,
        availability: t("unitsFree", { count: v.unitsAvailable }),
      }));
    }

    if (kind === "experience") {
      const experiences = await repos().experiences.list();
      return experiences.map((e) => ({
        id: e.id,
        name: e.name,
        detail: [
          tExp("duration", { count: e.durationHours }),
          tExp("groupMax", { count: e.groupMax }),
        ].join(" · "),
        rate: e.pricePerPerson,
        rateLabel: tExp("perPerson"),
        href: `/experiences/${e.slug}`,
        imageSeed: e.imageSeed,
        image: e.images?.[0],
        inspectedAt: e.verification.inspectedAt,
      }));
    }

    const listings = await repos().stays.list();
    return listings.map((l) => ({
      id: l.id,
      name: l.name,
      detail: [
        tListing("bedrooms", { count: l.bedrooms }),
        tListing("sleeps", { count: l.sleeps }),
      ].join(" · "),
      rate: l.nightlyRate,
      rateLabel: tListing("perNight"),
      href: `/stays/${l.slug}`,
      imageSeed: l.imageSeed,
      image: l.images?.[0],
      inspectedAt: l.verification.inspectedAt,
      availability: t("unitsFree", { count: l.unitsAvailable }),
    }));
  }

  const summary = [
    { key: "listed", label: t("listed"), value: String(items.length) },
    { key: "booked", label: t("bookedNow"), value: String(upcoming.length) },
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {t(`title.${lane}`)}
        </h1>
        <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
          {t(`subtitle.${lane}`)}
        </p>
      </header>

      {/* Counts and money, on a rule rather than in tiles. Three bordered
          boxes across the top is the house style of every admin template
          there has ever been, and it makes two integers look like an
          achievement. */}
      <dl className="flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-line py-5">
        {summary.map((stat) => (
          <div key={stat.key} className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-ink-3">{stat.label}</dt>
            <dd className="tnum font-display text-3xl font-semibold text-ink">
              {stat.value}
            </dd>
          </div>
        ))}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-3">{t("dueToYou")}</dt>
          <dd>
            <MoneyText
              amount={money(held.minor + due.minor, "RWF")}
              className="font-display text-3xl font-semibold text-ink"
            />
          </dd>
        </div>
      </dl>

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col">
          <section className="flex flex-col">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("booked")}
            </h2>
            {upcoming.length ? (
              <ul className="flex flex-col">{rows}</ul>
            ) : (
              <p className="border-t border-line py-6 text-[15px] text-ink-2">
                {t("nothingBooked")}
              </p>
            )}
          </section>

          <section className="flex flex-col pt-8">
            {/* Not the noun again — the h1 already said "Your vehicles", and
                repeating it here made the page look like two pages. */}
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("listedWithUs")}
            </h2>
            {/*
              Said plainly rather than left to be discovered. There is no
              ownership model in the fixtures, so this lane shows everything
              HomeLink has verified in it — which is also close to the truth of
              V1, where inventory is concierge-listed and the supplier side runs
              offline (§9 fast-follow #4).
            */}
            <p className="pt-1.5 text-[13px] leading-relaxed text-ink-3">
              {t("ownershipNote")}
            </p>
            <ul className="flex flex-col pt-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 border-t border-line py-5 sm:flex-row sm:items-center"
                >
                  <SupplyImage
                    seed={item.imageSeed}
                    src={item.image}
                    alt={item.name}
                    sizes="(max-width: 640px) 100vw, 160px"
                    className="h-32 w-full rounded-[6px] sm:h-20 sm:w-32 sm:flex-none"
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={item.href}
                      className="rounded-ctl text-[17px] font-semibold leading-snug text-ink hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    {/* Column one. */}
                    <p className="text-sm text-ink-2">{item.detail}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <VerifiedBadge label={tVerify("badge")} size="sm" />
                      <span className="text-[13px] text-ink-3">
                        {t("inspectedOn", {
                          date: formatDate(item.inspectedAt, intlLocale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }),
                        })}
                      </span>
                      {item.availability && (
                        <StatusPill tone="idle">{item.availability}</StatusPill>
                      )}
                    </div>
                  </div>

                  {/* Column two. */}
                  <div className="flex flex-none items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
                    <MoneyText
                      amount={item.rate}
                      className="text-[17px] font-bold text-ink"
                    />
                    <span className="text-[13px] text-ink-3">
                      {item.rateLabel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {settled.length > 0 && (
            <section className="flex flex-col pt-8">
              <h2 className="font-display text-2xl font-semibold text-ink">
                {t("settled")}
              </h2>
              <ul className="flex flex-col">{settledRows}</ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-ink">
            {t("moneyTitle")}
          </h2>

          <dl className="flex flex-col gap-3 text-[15px]">
            {[
              { key: "held", label: tVerify("escrow"), amount: held, tone: "warn" as const },
              { key: "due", label: t("dueOnStart"), amount: due, tone: null },
              { key: "paid", label: tStatus("fundsReleased"), amount: paid, tone: null },
            ].map((line) => (
              <div
                key={line.key}
                className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-3 last:border-b-0 last:pb-0"
              >
                <dt className="flex items-center gap-2 text-ink-2">
                  {line.label}
                </dt>
                <dd>
                  <MoneyText amount={line.amount} className="font-semibold text-ink" />
                </dd>
              </div>
            ))}
          </dl>

          {/* The one thing this screen must not imply. Nothing here moves
              money — the concierge runs payouts by hand and will until there
              is a ledger behind them. */}
          <p className="text-[13px] leading-relaxed text-ink-3">
            {t("moneyNote")}
          </p>
        </aside>
      </div>
    </div>
  );
}
