import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { nightsWithGuests } from "@/lib/workspace/guest-nights";
import { addDays, addMonths, formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { TabStrip } from "@/components/ui/tab-strip";
import { RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { PublishToggle } from "@/components/workspace/listing-editor/portfolio-forms";
import { DetailsTab } from "@/components/workspace/listing-editor/details";
import { PhotosTab } from "@/components/workspace/listing-editor/photos";
import { AmenitiesTab } from "@/components/workspace/listing-editor/amenities";
import { RulesTab } from "@/components/workspace/listing-editor/rules";
import { PricingTab } from "@/components/workspace/listing-editor/pricing";
import { AvailabilityTab } from "@/components/workspace/listing-editor/availability";
import { CheckInTab } from "@/components/workspace/listing-editor/checkin";
import { ManagerTab } from "@/components/workspace/listing-editor/manager";
import { ChevronLeftIcon } from "@/components/ui/icons";

const TABS = ["details", "photos", "amenities", "rules", "pricing", "availability", "checkin", "manager", "inspection"] as const;
type Tab = (typeof TABS)[number];

/**
 * One home, edited a tab at a time. The tab is in the URL so a link can
 * open the pricing of a home directly, and each tab saves only its own
 * fields. Leaving a tab with changes asks first.
 */
export default async function ListingEditor({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ tab?: string; month?: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const access = await requireSection("portfolio");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const listing = (await repos().stays.all()).find((l) => l.slug === slug);
  if (!listing) notFound();
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "details";
  const t = await getTranslations("workspace.editor");
  const intl = INTL_LOCALES[locale as Locale];
  const live = listing.published !== false;
  const today = kigaliDay();

  let availability = null;
  if (tab === "availability") {
    const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
    const first = `${month}-01`;
    const days = Array.from({ length: 31 }, (_, i) => addDays(first, i)).filter((d) => d.startsWith(month));
    const [bookings, blocks] = await Promise.all([repos().bookings.listAll(), repos().availability.blocked(listing.id, first, addMonths(first, 1))]);
    const guests = new Set(nightsWithGuests(bookings, listing.id, first, days.length));
    availability = {
      month,
      prev: addMonths(first, -1).slice(0, 7),
      next: addMonths(first, 1).slice(0, 7),
      nights: days.map((date) => {
        const block = blocks.find((b) => b.date === date);
        const state = guests.has(date) ? "booked" : block ? block.reason : date < today ? "past" : "free";
        return { date, state: state as "free" | "booked" | "owner" | "maintenance" | "past" };
      }),
    };
  }
  const team = tab === "manager" ? await repos().ops.team() : [];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/manage/portfolio" className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ChevronLeftIcon size={14} />
        {t("portfolio")}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <StatusPill tone={live ? "ok" : "idle"}>{live ? t("live") : t("draft")}</StatusPill>
            <span className="text-[13px] text-ink-3">{listing.neighbourhood}</span>
          </div>
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{listing.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {live && (
            <Link href={`/stays/${listing.slug}`} className="inline-flex min-h-10 items-center rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand">
              {t("viewOnSite")}
            </Link>
          )}
          <PublishToggle id={listing.id} published={live} />
        </div>
      </header>

      <TabStrip
        label={t("sections")}
        active={tab}
        tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: `/manage/portfolio/${listing.slug}?tab=${k}` }))}
      />

      <section className="rounded-card border border-line bg-surface px-4 pt-5 sm:px-5">
        <div className="pb-5">
          {tab === "details" && <DetailsTab key={listing.id} listing={listing} />}
          {tab === "photos" && <PhotosTab key={listing.id} listing={listing} />}
          {tab === "amenities" && <AmenitiesTab key={listing.id} listing={listing} />}
          {tab === "rules" && <RulesTab key={listing.id} listing={listing} />}
          {tab === "pricing" && <PricingTab key={listing.id} listing={listing} />}
          {tab === "checkin" && <CheckInTab key={listing.id} listing={listing} />}
          {tab === "manager" && <ManagerTab key={listing.id} listing={listing} team={team} />}
          {tab === "availability" && availability && <AvailabilityTab listingId={listing.id} slug={listing.slug} {...availability} />}
          {tab === "inspection" && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] text-ink-2">{t("inspectionHint")}</p>
              <RecordFacts>
                <RecordFact label={t("inspector")}>{listing.verification.inspectorName || t("notYet")}</RecordFact>
                <RecordFact label={t("inspectedOn")}>{listing.verification.inspectorName ? formatDate(listing.verification.inspectedAt, intl) : t("notYet")}</RecordFact>
                <RecordFact label={t("points")}>{listing.verification.checklistPoints}</RecordFact>
                <RecordFact label={t("photographed")}>{listing.verification.photographedByHomeLink ? t("yes") : t("no")}</RecordFact>
                <RecordFact label={t("ownerChecked")}>{listing.verification.ownerIdentityConfirmed ? t("yes") : t("no")}</RecordFact>
              </RecordFacts>
              {listing.verification.notes && <p className="max-w-[70ch] text-[14px] text-ink-2">{listing.verification.notes}</p>}
              <Link href="/manage/inspections" className="self-start text-[14px] font-semibold text-brand hover:underline">{t("toInspections")}</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
