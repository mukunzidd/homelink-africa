import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { addDays, addMonths } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { exponentOf, formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { RateGrid, type RateCell } from "@/components/workspace/rate-grid";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { dateTimeFormat } from "@/lib/domain/date-format";

/**
 * What each night of a home sells for, a month at a time, against its
 * base rate. A home is picked from the row of names; the month moves with
 * the arrows. Prices are in the currency the home is paid in.
 */
export default async function Rates({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ home?: string; month?: string; property?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("rates");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const t = await getTranslations("workspace.rates");
  const intl = INTL_LOCALES[locale as Locale];
  const homes = (await repos().stays.all()).filter((h) => h.modes.includes("nightly")).sort((a, b) => a.name.localeCompare(b.name));
  const home = homes.find((h) => h.slug === sp.home) ?? homes.find((h) => h.id === sp.property) ?? homes[0];
  const today = kigaliDay();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const first = `${month}-01`;
  // Six whole weeks from the Monday on or before the 1st.
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(first, -lead);
  const nights = await repos().rates.forRange(home.id, start, addDays(start, 42));
  const exp = exponentOf(home.nightlyRate.currency);
  const cells: RateCell[] = nights.map((n) => ({ date: n.date, major: n.rate.minor / 10 ** exp, own: n.own, inMonth: n.date.startsWith(month), past: n.date < today }));
  const own = Object.keys(home.nightlyRates ?? {}).filter((d) => d >= today).length;
  const link = (m: string, slug = home.slug) => `/manage/rates?home=${slug}&month=${m}`;
  const title = dateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SectionHeader title={t("title")} description={t("body")} />
      <nav aria-label={t("homes")} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {homes.map((h) => (
          <Link key={h.id} href={link(month, h.slug)} aria-current={h.id === home.id ? "page" : undefined} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium", h.id === home.id ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2 hover:border-brand")}>
            {h.name}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link(addMonths(first, -1).slice(0, 7))} aria-label={t("prev")} className="grid size-9 place-items-center rounded-ctl border border-line bg-surface text-ink-2 hover:border-brand"><ChevronLeftIcon size={16} /></Link>
          <h2 className="min-w-40 text-center text-[16px] font-semibold capitalize text-ink">{title}</h2>
          <Link href={link(addMonths(first, 1).slice(0, 7))} aria-label={t("next")} className="grid size-9 place-items-center rounded-ctl border border-line bg-surface text-ink-2 hover:border-brand"><ChevronRightIcon size={16} /></Link>
        </div>
        <p className="text-[14px] text-ink-2">
          {t("base")} <span className="tnum font-semibold text-ink">{formatMoney(home.nightlyRate, intl)}</span> · {t("ownCount", { count: own })}
        </p>
      </div>
      <RateGrid key={`${home.id}${month}`} listingId={home.id} cells={cells} base={home.nightlyRate.minor / 10 ** exp} currency={home.nightlyRate.currency} />
    </div>
  );
}
