import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { occupancy } from "@/lib/workspace/metrics";
import { addDays, formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { SupplyImage } from "@/components/ui/supply-image";
import { MoneyText } from "@/components/ui/money-text";
import { NewListing } from "@/components/workspace/listing-editor/portfolio-forms";
import { cn } from "@/lib/cn";

/**
 * Every home, live or not, with what admin checks first: how full it is
 * for the next month, who arrives next, and whether anything is broken.
 * A table on a desk, cards when asked for or on a phone. Homes inspected
 * but not yet written up wait at the top, one click from a draft.
 */
export default async function Portfolio({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("portfolio");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const view = sp.view === "cards" ? "cards" : "table";
  const t = await getTranslations("workspace.editor");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [homes, bookings, tickets, drafts] = await Promise.all([repos().stays.all(), repos().bookings.listAll(), repos().work.tickets(), repos().ops.drafts()]);
  const stayDrafts = drafts.filter((d) => d.service === "stay" && !homes.some((h) => h.name === d.name));
  const rows = homes
    .map((l) => {
      const next = bookings.filter((b) => b.supplyItemId === l.id && b.status === "confirmed" && b.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      return {
        l,
        occ: occupancy(bookings, l.id, today, addDays(today, 30)),
        next,
        open: tickets.filter((x) => x.listingId === l.id && x.status !== "done").length,
      };
    })
    .sort((a, b) => Number(a.l.published !== false) - Number(b.l.published !== false) || a.l.name.localeCompare(b.l.name));
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const short = (d: string) => formatDate(d, intl, { day: "numeric", month: "short" });
  const live = (p?: boolean) => p !== false;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("portfolio")} description={t("portfolioBody", { count: homes.length, live: homes.filter((h) => live(h.published)).length })} />
      <NewListing neighbourhoods={[...new Set(homes.map((h) => h.neighbourhood))].sort()} />

      {stayDrafts.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card border border-dashed border-brand/50 bg-brand-tint/30 p-4">
          <h2 className="text-[14px] font-semibold text-ink">{t("fromInspections")}</h2>
          <ul className="flex flex-col gap-2">
            {stayDrafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
                <span><span className="font-semibold text-ink">{d.name}</span> <span className="text-ink-3">· {d.where}</span></span>
                <NewListing neighbourhoods={[]} from={{ name: d.name, where: d.where }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div role="tablist" aria-label={t("view")} className="flex gap-1 self-end rounded-ctl border border-line bg-surface-2 p-1">
        {(["table", "cards"] as const).map((v) => (
          <Link key={v} role="tab" aria-selected={view === v} href={`/manage/portfolio?view=${v}`} className={cn("rounded-inner px-3 py-1 text-[13px] font-medium", view === v ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2")}>
            {t(`views.${v}`)}
          </Link>
        ))}
      </div>

      {view === "table" && (
        <div className="hidden overflow-clip rounded-card border border-line bg-surface lg:block">
          <table className="w-full text-[14px]">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[12.5px] text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("home")}</th>
                <th className="px-3 py-2.5 font-medium">{t("offeredFor")}</th>
                <th className="px-3 py-2.5 font-medium">{t("rate")}</th>
                <th className="px-3 py-2.5 text-right font-medium">{t("next30")}</th>
                <th className="px-3 py-2.5 font-medium">{t("nextArrival")}</th>
                <th className="px-3 py-2.5 text-right font-medium">{t("openTickets")}</th>
                <th className="px-4 py-2.5 font-medium">{t("state")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ l, occ, next, open }) => (
                <tr key={l.id} className="border-t border-line-soft first:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/manage/portfolio/${l.slug}`} className="flex items-center gap-3">
                      <SupplyImage seed={l.imageSeed} src={l.images?.[0]} alt="" sizes="56px" className="h-10 w-14 flex-none rounded-inner" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-ink hover:text-brand">{l.name}</span>
                        <span className="text-[12.5px] text-ink-3">{l.neighbourhood}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">{l.modes.map((m) => t(`mode.${m}`)).join(" · ")}</td>
                  <td className="tnum px-3 py-2.5 text-ink-2"><MoneyText amount={l.nightlyRate} rounded /></td>
                  <td className="tnum px-3 py-2.5 text-right text-ink">{pct(occ)}</td>
                  <td className="px-3 py-2.5 text-ink-2">{next ? `${short(next.startDate)} · ${next.guest?.name ?? ""}` : "·"}</td>
                  <td className={cn("tnum px-3 py-2.5 text-right", open ? "font-semibold text-warn" : "text-ink-3")}>{open || "·"}</td>
                  <td className="px-4 py-2.5"><StatusPill tone={live(l.published) ? "ok" : "idle"}>{live(l.published) ? t("live") : t("draft")}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", view === "table" && "lg:hidden")}>
        {rows.map(({ l, occ, next, open }) => (
          <li key={l.id}>
            <Link href={`/manage/portfolio/${l.slug}`} className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface hover:border-brand">
              <SupplyImage seed={l.imageSeed} src={l.images?.[0]} alt="" sizes="(max-width: 640px) 100vw, 33vw" className="h-36" />
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone={live(l.published) ? "ok" : "idle"}>{live(l.published) ? t("live") : t("draft")}</StatusPill>
                  <span className="text-[12.5px] text-ink-3">{l.modes.map((m) => t(`mode.${m}`)).join(" · ")}</span>
                </div>
                <p className="text-[16px] font-semibold text-ink">{l.name}</p>
                <p className="text-[13px] text-ink-3">{l.neighbourhood}</p>
                <dl className="mt-auto grid grid-cols-3 gap-2 pt-2 text-[12.5px]">
                  <div><dt className="text-ink-3">{t("next30")}</dt><dd className="tnum font-semibold text-ink">{pct(occ)}</dd></div>
                  <div><dt className="text-ink-3">{t("nextArrival")}</dt><dd className="font-semibold text-ink">{next ? short(next.startDate) : "·"}</dd></div>
                  <div><dt className="text-ink-3">{t("openTickets")}</dt><dd className={cn("tnum font-semibold", open ? "text-warn" : "text-ink")}>{open}</dd></div>
                </dl>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
