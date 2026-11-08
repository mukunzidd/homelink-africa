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
import { formatDate, formatDateRange, today } from "@/lib/domain/dates";
import { supplierShare } from "@/lib/domain/pricing";
import { paginate, pageParam } from "@/lib/paginate";
import { ROLE_COOKIE, parseRole, supplyLaneFor } from "@/lib/preferences/role";
import { BookingRow } from "@/components/bookings/booking-row";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { TabStrip } from "@/components/ui/tab-strip";
import { Pager } from "@/components/ui/pager";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inventory");
  return { title: t("metaTitle") };
}

/**
 * One shell for host, driver and guide.
 *
 * Their journey has the same shape — I list a thing, it gets booked, I get
 * paid — so the page has the same three tabs in the same order for all three.
 * What changes is the noun in the headings and the two columns on an inventory
 * row: what the thing *is* (bedrooms, gearbox, hours) and what it costs (per
 * night, per day, per person).
 *
 * The lane is chosen from the role cookie on the server, so a driver's HTML
 * never contains a host's rows. See `lib/preferences/role.ts`.
 *
 * The three sections were one scroll. They are tabs now for the same reason
 * the queue's are: a section should be addressable, and the counts in the
 * header should be able to take you to the thing they are counting.
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

const PER_PAGE = 8;

type TabKey = "booked" | "listings" | "money";
const TAB_KEYS: TabKey[] = ["booked", "listings", "money"];

type SortKey = "rate" | "name" | "inspected";
const SORT_KEYS: SortKey[] = ["rate", "name", "inspected"];

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string; sort?: string }>;
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

  const sp = await searchParams;
  const tab: TabKey = TAB_KEYS.includes(sp.tab as TabKey)
    ? (sp.tab as TabKey)
    : "booked";
  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "rate";

  const items = sortItems(await itemsFor(lane), sort);

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
  // Money that did not arrive is the thing a supplier notices most, and this
  // screen used to drop it entirely — a cancelled hire appeared on the guest's
  // Trips under "Earlier" and simply vanished from the operator's own page.
  const cancelled = bookings
    .filter((b) => b.status === "cancelled")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Every figure on this page is the supplier's share. `booking.total` is what
  // the guest paid, service fee included, and showing that as "coming to you"
  // promised a host money HomeLink keeps.
  const net = (b: Booking) => supplierShare(b.total, b.service).net;
  const held = sum(upcoming.filter((b) => b.escrowHeld).map(net), "RWF");
  const due = sum(upcoming.filter((b) => !b.escrowHeld).map(net), "RWF");
  const paid = sum(settled.map(net), "RWF");
  const lost = sum(cancelled.map(net), "RWF");

  // The arithmetic behind "Coming to you", for the Money tab. Upcoming only,
  // because that is the figure in the stat band; settled money is already
  // the supplier's and its fee is history.
  const upcomingGross = sum(upcoming.map((b) => b.total), "RWF");
  const upcomingFee = sum(
    upcoming.map((b) => supplierShare(b.total, b.service).fee),
    "RWF",
  );

  const bookingList = [...upcoming, ...settled, ...cancelled];

  const at = pageParam(sp.page);
  const view =
    tab === "listings"
      ? ({ tab, page: paginate(items, at, PER_PAGE) } as const)
      : ({ tab, page: paginate(bookingList, at, PER_PAGE) } as const);

  const hrefFor = (next: { tab?: TabKey; sort?: SortKey; page?: number }) => {
    const q = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextSort = next.sort ?? sort;
    if (nextTab !== "booked") q.set("tab", nextTab);
    if (nextSort !== "rate") q.set("sort", nextSort);
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const qs = q.toString();
    return `/inventory${qs ? `?${qs}` : ""}`;
  };

  async function renderBooking(booking: Booking) {
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
        viewer="supply"
        muted={booking.status !== "confirmed" && booking.status !== "active"}
        aside={
          // The supplier's column. A guest wants to know their money is safe;
          // a supplier wants to know when it stops being safe and becomes
          // theirs. Same field, opposite reading.
          <p className="text-[13px] text-ink-3">
            {booking.status === "cancelled"
              ? t("payoutCancelled")
              : booking.status === "completed"
                ? t("payoutSettled")
                : booking.escrowHeld
                  ? t("payoutAfterCheckIn")
                  : t("payoutOnStart")}
          </p>
        }
      />
    );
  }

  const bookedRows =
    view.tab === "booked"
      ? await Promise.all(view.page.items.map((b) => renderBooking(b as Booking)))
      : [];

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

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {t(`title.${lane}`)}
        </h1>
        <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
          {t(`subtitle.${lane}`)}
        </p>
      </header>

      {/* Counts and money, on a rule rather than in tiles, and each one a link
          into the tab it counts. Three bordered boxes across the top is the
          house style of every admin template there has ever been, and it makes
          two integers look like an achievement. */}
      <dl className="flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-line py-5">
        {(
          [
            { key: "listings", label: t("listed"), value: String(items.length) },
            { key: "booked", label: t("bookedNow"), value: String(upcoming.length) },
          ] as const
        ).map((stat) => (
          <Link
            key={stat.key}
            href={hrefFor({ tab: stat.key })}
            className="group flex flex-col gap-0.5 rounded-ctl"
          >
            <dt className="text-[13px] text-ink-3 group-hover:text-ink-2">
              {stat.label}
            </dt>
            <dd className="tnum font-display text-3xl font-semibold text-ink underline-offset-4 group-hover:underline">
              {stat.value}
            </dd>
          </Link>
        ))}
        <Link
          href={hrefFor({ tab: "money" })}
          className="group flex flex-col gap-0.5 rounded-ctl"
        >
          <dt className="text-[13px] text-ink-3 group-hover:text-ink-2">
            {t("dueToYou")}
          </dt>
          <dd className="underline-offset-4 group-hover:underline">
            <MoneyText
              amount={money(held.minor + due.minor, "RWF")}
              className="font-display text-3xl font-semibold text-ink"
            />
          </dd>
        </Link>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabStrip
          label={t("tabsLabel")}
          active={tab}
          tabs={[
            {
              key: "booked",
              label: t("tabs.booked"),
              href: hrefFor({ tab: "booked" }),
              count: bookingList.length,
            },
            {
              key: "listings",
              label: t("tabs.listings"),
              href: hrefFor({ tab: "listings" }),
              count: items.length,
            },
            { key: "money", label: t("tabs.money"), href: hrefFor({ tab: "money" }) },
          ]}
        />

        {tab === "listings" && (
          <div className="flex items-center gap-1">
            <span className="pr-1 text-[13px] text-ink-3">{t("sortLabel")}</span>
            {SORT_KEYS.map((key) => (
              <Link
                key={key}
                href={hrefFor({ sort: key, page: 1 })}
                aria-current={key === sort ? "true" : undefined}
                className={cn(
                  "rounded-ctl px-2.5 py-1.5 text-[13px] font-semibold transition-colors duration-150",
                  key === sort
                    ? "bg-surface-2 text-ink"
                    : "text-ink-3 hover:bg-surface-2/60 hover:text-ink",
                )}
              >
                {t(`sort.${key}`)}
              </Link>
            ))}
          </div>
        )}
      </div>

      {tab === "booked" && (
        <section className="flex flex-col">
          {bookingList.length ? (
            <ul className="flex flex-col">{bookedRows}</ul>
          ) : (
            <p className="border-t border-line py-8 text-[15px] text-ink-2">
              {t("nothingBooked")}
            </p>
          )}
          <Pager page={view.page} hrefFor={(n) => hrefFor({ page: n })} className="mt-4" />
        </section>
      )}

      {tab === "listings" && (
        <section className="flex flex-col">
          {/*
            Said plainly rather than left to be discovered. There is no
            ownership model in the fixtures, so this lane shows everything
            HomeLink has verified in it — which is also close to the truth of
            V1, where inventory is concierge-listed and the supplier side runs
            offline (§9 fast-follow #4).
          */}
          <p className="pb-3 text-[13px] leading-relaxed text-ink-3">
            {t("ownershipNote")}
          </p>
          <ul className="flex flex-col">
            {(view.page.items as InventoryItem[]).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 border-t border-line py-5 sm:flex-row sm:items-center"
              >
                <SupplyImage
                  seed={item.imageSeed}
                  src={item.image}
                  alt={item.name}
                  sizes="(max-width: 640px) 100vw, 160px"
                  className="h-32 w-full rounded-inner sm:h-20 sm:w-32 sm:flex-none"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={item.href}
                    className="rounded-ctl text-[17px] font-semibold leading-snug text-ink hover:text-brand"
                  >
                    {item.name}
                  </Link>
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

                {/* The rate is already the supplier's figure: the service fee
                    is added on top of it at checkout, not taken out of it. So
                    the number stays, and the line under it says what the
                    guest sees, which is the question a host asks next. */}
                <div className="flex flex-none flex-wrap items-baseline gap-x-1.5 sm:flex-col sm:items-end sm:gap-0">
                  <MoneyText
                    amount={item.rate}
                    className="text-[17px] font-semibold text-ink"
                  />
                  <span className="text-[13px] text-ink-3">{item.rateLabel}</span>
                  <span className="basis-full text-[12px] text-ink-3 sm:basis-auto">
                    {t("rateYours")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Pager page={view.page} hrefFor={(n) => hrefFor({ page: n })} className="mt-4" />
        </section>
      )}

      {tab === "money" && (
        <section className="flex flex-col gap-5">
          <dl className="flex flex-col">
            {[
              { key: "held", label: tVerify("escrow"), amount: held },
              { key: "due", label: t("dueOnStart"), amount: due },
              { key: "paid", label: tStatus("fundsReleased"), amount: paid },
              ...(cancelled.length
                ? [{ key: "lost", label: tStatus("cancelled"), amount: lost }]
                : []),
            ].map((line) => (
              <div
                key={line.key}
                className={cn(
                  "flex items-baseline justify-between gap-4 border-t border-line py-4",
                  line.key === "lost" && "text-ink-3",
                )}
              >
                <dt className="text-[15px] text-ink-2">{line.label}</dt>
                <dd>
                  <MoneyText amount={line.amount} className="font-semibold text-ink" />
                </dd>
              </div>
            ))}
          </dl>

          {/* Gross, fee, net, for the one figure the header leads with. A
              supplier who knows what the guest paid will otherwise subtract
              the two and wonder where the rest went. */}
          {upcoming.length > 0 && (
            <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
              <h2 className="text-xs font-medium text-ink-3">{t("breakdownTitle")}</h2>
              <dl className="flex flex-col gap-1.5 text-[14px]">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-2">{t("breakdownGross")}</dt>
                  <dd>
                    <MoneyText amount={upcomingGross} className="text-ink" />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-2">{t("breakdownFee")}</dt>
                  <dd className="text-ink-2">
                    −<MoneyText amount={upcomingFee} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
                  <dt className="font-semibold text-ink">{t("dueToYou")}</dt>
                  <dd>
                    <MoneyText
                      amount={money(held.minor + due.minor, "RWF")}
                      className="font-semibold text-ink"
                    />
                  </dd>
                </div>
              </dl>
              <p className="text-[13px] leading-relaxed text-ink-3">{t("breakdownNote")}</p>
            </div>
          )}

          {/* Every line above, traced back to the booking it came from. Three
              sums with nothing behind them is a number you cannot check. */}
          <div className="flex flex-col">
            <h2 className="font-display text-xl font-semibold text-ink">
              {t("whereFrom")}
            </h2>
            <ul className="flex flex-col">
              {bookings.map((booking) => {
                const share = supplierShare(booking.total, booking.service);
                return (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line py-3"
                  >
                    <span className="font-mono text-[12px] text-ink-3">
                      {booking.reference}
                    </span>
                    {/* No truncate. At 390 this cut the dates mid-year — and the
                        dates are the reason anybody reads the line. Wrapping
                        costs a second row on a narrow screen and loses nothing. */}
                    <span className="tnum text-[14px] text-ink-2">
                      {formatDateRange(booking.startDate, booking.endDate, intlLocale)}
                    </span>
                    <span className="ml-auto text-[13px] text-ink-3">
                      {tStatus(booking.status)}
                    </span>
                    <span className="flex flex-none flex-col items-end">
                      <MoneyText
                        amount={share.net}
                        className="text-[14px] font-semibold text-ink"
                      />
                      <span className="text-[12px] text-ink-3">
                        {t("rowGross")} <MoneyText amount={share.gross} /> ·{" "}
                        {t("rowFee")} <MoneyText amount={share.fee} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The one thing this screen must not imply. Nothing here moves
              money — the concierge runs payouts by hand and will until there
              is a ledger behind them. */}
          <p className="border-t border-line pt-4 text-[13px] leading-relaxed text-ink-3">
            {t("moneyNote")}
          </p>
        </section>
      )}

    </div>
  );
}

/** Rate first by default: it is the number a supplier is actually managing. */
function sortItems(items: InventoryItem[], sort: SortKey): InventoryItem[] {
  const out = [...items];
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "inspected")
    out.sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt));
  else out.sort((a, b) => b.rate.minor - a.rate.minor);
  return out;
}
