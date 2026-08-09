import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { supplyRefFor } from "@/lib/repos/supply-ref";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { Booking, Trip } from "@/lib/domain/types";
import { today } from "@/lib/domain/dates";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { BookingRow } from "@/components/bookings/booking-row";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trips");
  return { title: t("title") };
}

/**
 * The guest's own screen.
 *
 * Bookings first, trips second. A trip is an optional grouping — Product & UX
 * Principle 2 is that a booking stands alone, and a local renting a flat in
 * Remera never sees one — so the list is a list of bookings and a trip name is
 * a label that appears on the rows it happens to cover. Written the other way
 * round, the cancelled Corolla hire that belongs to no trip would simply not
 * be on the page.
 *
 * "Coming up" and "earlier" split on the end date rather than the start,
 * because a stay you are in the middle of is not over.
 *
 * Role-checked like the other two dashboards. It was not, which meant a host
 * or an ops user who landed here read the guest's bookings and the guest's
 * threads. Nothing was exposed that the fixtures do not already publish, but
 * it is the wrong shape to still be carrying when auth arrives.
 */
export default async function TripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("trips");
  const tConfirm = await getTranslations("confirmation");
  const intlLocale = INTL_LOCALES[locale as Locale];

  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role !== "guest") {
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

  const [bookings, trips] = await Promise.all([
    repos().bookings.listForCurrentUser(),
    repos().trips.listForCurrentUser(),
  ]);

  const now = today();
  const upcoming = bookings
    .filter((b) => b.endDate >= now && b.status !== "cancelled")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const earlier = bookings
    .filter((b) => b.endDate < now || b.status === "cancelled")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const tripFor = (booking: Booking): Trip | undefined =>
    trips.find((trip) => trip.bookingIds.includes(booking.id));

  async function rowsFor(list: Booking[], muted: boolean) {
    return Promise.all(
      list.map(async (booking) => {
        const [supply, conversation] = await Promise.all([
          supplyRefFor(booking),
          // The guest's thread on this booking, not the concierge-to-host one.
          repos().messaging.forBooking(booking.id, role),
        ]);
        const trip = tripFor(booking);

        return (
          <BookingRow
            key={booking.id}
            booking={booking}
            supply={supply}
            conversation={conversation}
            locale={intlLocale}
            muted={muted}
            aside={
              trip && (
                <p className="text-[13px] text-ink-3">
                  {t("partOf", { name: trip.name })}
                </p>
              )
            }
          />
        );
      }),
    );
  }

  const [upcomingRows, earlierRows] = await Promise.all([
    rowsFor(upcoming, false),
    rowsFor(earlier, true),
  ]);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col">
          <section className="flex flex-col pb-2">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("comingUp")}
            </h2>
            {upcoming.length ? (
              <ul className="flex flex-col">{upcomingRows}</ul>
            ) : (
              <div className="flex flex-col items-start gap-3 border-t border-line py-6">
                <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                  {t("emptyBody")}
                </p>
                <Link href="/stays">
                  <Button variant="secondary" size="sm">
                    {t("browse")}
                  </Button>
                </Link>
              </div>
            )}
          </section>

          {earlier.length > 0 && (
            <section className="flex flex-col pt-8">
              <h2 className="font-display text-2xl font-semibold text-ink">
                {t("earlier")}
              </h2>
              <ul className="flex flex-col">{earlierRows}</ul>
            </section>
          )}
        </div>

        {/*
          The same offer as the confirmation screen, and deliberately the same
          words. It is the one thing on this page that is not a record of
          something already decided, and the confirmation page argued the case
          for asking a person rather than opening a second search — that
          argument does not weaken a week later when someone comes back to
          check their dates.
        */}
        <aside className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-ink">
            {tConfirm("arrangeTitle")}
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-2">
            {tConfirm("arrangeBody")}
          </p>
          <Link href="/messages" className="mt-1">
            <Button variant="trust">{tConfirm("arrangeAction")}</Button>
          </Link>
          <p className="text-[13px] text-ink-3">{tConfirm("arrangeNote")}</p>
        </aside>
      </div>
    </div>
  );
}
