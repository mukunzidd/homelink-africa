import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Booking, BookingStatus, ServiceKind } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDateRange, formatDate, isIsoDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { DataTable, type Column } from "@/components/workspace/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { STATUS_TONE, paidState } from "@/lib/workspace/paid-state";

const PER_PAGE = 25;
const STATUSES: BookingStatus[] = ["confirmed", "active", "completed", "cancelled"];
const LANES: ServiceKind[] = ["stay", "car", "experience"];
const SORTS = ["reference", "guest", "dates", "status"] as const;
type Sort = (typeof SORTS)[number];
/**
 * Every booking, for the desk. Filters live in the URL (a plain GET form, so
 * it works before any script loads and a filtered view can be sent to a
 * colleague); 25 to a page, newest arrival first unless sorted otherwise.
 */
export default async function Bookings({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("bookings");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const [t, tStatus] = await Promise.all([getTranslations("workspace.bookings"), getTranslations("status")]);
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];

  const status = STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const lane = LANES.includes(sp.lane as ServiceKind) ? (sp.lane as ServiceKind) : undefined;
  const from = isIsoDate(sp.from) ? sp.from : undefined;
  const to = isIsoDate(sp.to) ? sp.to : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "dates";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const [all, payments] = await Promise.all([
    repos().bookings.listAll({ status: status ? [status] : undefined, service: lane, from, to, q }),
    repos().bookings.payments(),
  ]);
  const key = (b: Booking) =>
    sort === "reference" ? b.reference : sort === "guest" ? (b.guest?.name ?? "") : sort === "status" ? b.status : b.startDate;
  const sorted = [...all].sort((a, b) => key(a).localeCompare(key(b)) * (dir === "asc" ? 1 : -1));
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const rows = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const href = (over: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, lane, from, to, sort: sp.sort, dir: sp.dir, page: undefined, ...over })) if (v) u.set(k, v);
    const s = u.toString();
    return `/manage/bookings${s ? `?${s}` : ""}`;
  };

  const paidTone = { paid: "ok", part: "warn", refunded: "idle", none: "crit" } as const;
  const columns: Column<Booking>[] = [
    { key: "reference", header: t("colReference"), sortable: true, cell: (b) => <span className="whitespace-nowrap font-mono text-[13px] font-semibold">{b.reference}</span> },
    { key: "guest", header: t("colGuest"), sortable: true, primary: true, cell: (b) => b.guest?.name ?? "" },
    { key: "what", header: t("colWhat"), hideBelow: "xl", cell: (b) => <span className="line-clamp-1 max-w-[26ch] text-ink-2">{b.title}</span> },
    {
      key: "dates",
      header: t("colDates"),
      sortable: true,
      cell: (b) => <span className="whitespace-nowrap">{b.startDate === b.endDate ? formatDate(b.startDate, intl, { day: "numeric", month: "short" }) : formatDateRange(b.startDate, b.endDate, intl)}</span>,
    },
    { key: "status", header: t("colStatus"), sortable: true, cell: (b) => <StatusPill tone={STATUS_TONE[b.status]}>{tStatus(b.status)}</StatusPill> },
    { key: "total", header: t("colTotal"), align: "right", cell: (b) => <span className="tnum whitespace-nowrap">{formatMoney(b.total, num)}</span> },
    { key: "paid", header: t("colPaid"), hideBelow: "md", cell: (b) => { const s = paidState(b, payments); return <StatusPill tone={paidTone[s]}>{t(`paid.${s}`)}</StatusPill>; } },
    { key: "escrow", header: t("colEscrow"), hideBelow: "xl", cell: (b) => (b.escrowHeld ? <span className="text-[13px] text-warn">{t("escrowHeld")}</span> : <span className="text-ink-3">·</span>) },
  ];

  const control = "min-h-10 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink";
  const filtered = !!(q || status || lane || from || to);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("title")} description={t("description", { count: all.length })} />

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12.5px] text-ink-3">
          {t("search")}
          <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={control} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
          {t("colStatus")}
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">{t("all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{tStatus(s)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
          {t("lane")}
          <select name="lane" defaultValue={lane ?? ""} className={control}>
            <option value="">{t("all")}</option>
            {LANES.map((l) => <option key={l} value={l}>{t(`lanes.${l}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
          {t("from")}
          <input type="date" name="from" defaultValue={from} className={control} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
          {t("to")}
          <input type="date" name="to" defaultValue={to} className={control} />
        </label>
        <button type="submit" className="min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep">{t("apply")}</button>
        {filtered && <Link href="/manage/bookings" className="min-h-10 content-center rounded-ctl px-3 text-[14px] font-semibold text-ink-2 hover:bg-surface-2">{t("clear")}</Link>}
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        rowHref={(b) => `/manage/bookings/${b.reference}`}
        sort={{ key: sort, dir }}
        sortHref={(k, d) => href({ sort: k, dir: d })}
        empty={filtered ? t("emptyFiltered") : t("empty")}
        caption={t("title")}
      />

      {pages > 1 && (
        <nav aria-label={t("pages")} className="flex items-center justify-between text-[14px]">
          <span className="tnum text-ink-3">{t("pageOf", { page, pages })}</span>
          <span className="flex gap-2">
            {[
              [page - 1, t("prev"), page <= 1],
              [page + 1, t("next"), page >= pages],
            ].map(([p, label, off]) => (
              <Link key={String(label)} href={href({ page: String(p) })} aria-disabled={!!off} className={cn("rounded-ctl border border-line bg-surface px-3 py-1.5 font-semibold", off ? "pointer-events-none opacity-40" : "hover:border-brand")}>
                {label}
              </Link>
            ))}
          </span>
        </nav>
      )}
    </div>
  );
}
