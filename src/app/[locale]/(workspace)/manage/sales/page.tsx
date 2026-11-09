import { getTranslations, setRequestLocale } from "next-intl/server";
import type { HomeForSale, Viewing } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { exponentOf, formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { SupplyImage } from "@/components/ui/supply-image";
import { QueueRow } from "@/components/queue/queue-row";
import { SaleEditor, ViewingActions } from "@/components/workspace/homes-admin-forms";

const SALE_TONE: Record<NonNullable<HomeForSale["saleStatus"]>, StatusTone> = { onMarket: "ok", underOffer: "warn", sold: "idle" };
const VIEW_TONE: Record<Viewing["status"], StatusTone> = { requested: "warn", confirmed: "ok", rescheduled: "ok", done: "idle", cancelled: "idle" };

/** Homes on the market, and the people asking to see them. Every change to a viewing tells the person who asked. */
export default async function Sales({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("sales");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.homes");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [homes, viewings] = await Promise.all([repos().sales.all(), repos().viewings.all()]);
  const open = viewings.filter((v) => v.status !== "done" && v.status !== "cancelled");
  const day = (d: string) => formatDate(d, intl, { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("sales")} description={t("salesBody")} />
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{t("viewings")} <span className="tnum font-normal text-ink-3">· {open.length}</span></h2>
        {viewings.length ? (
          <ul className="flex flex-col border-b border-line">
            {viewings.map((v) => {
              const h = homes.find((x) => x.id === v.saleId);
              return (
                <QueueRow
                  key={v.id}
                  muted={v.status === "done" || v.status === "cancelled"}
                  summary={
                    <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={VIEW_TONE[v.status]}>{t(`view.${v.status}`)}</StatusPill>
                          <span className="text-[12.5px] text-ink-3">{t(`mode.${v.mode}`)}</span>
                        </span>
                        <span className="text-[15px] font-semibold text-ink">{v.contact.name}</span>
                        <span className="text-[13px] text-ink-3">{h?.name}</span>
                      </span>
                      <span className="tnum flex-none text-[14px] font-semibold text-ink sm:w-44">{day(v.date)} · {v.time}</span>
                    </span>
                  }
                >
                  <p className="text-[14px] text-ink-2">{v.contact.email} · {v.contact.phone}</p>
                  {v.notes && <p className="max-w-[70ch] text-[14px] text-ink-2">{v.notes}</p>}
                  <ViewingActions id={v.id} status={v.status} date={v.date} time={v.time} today={today} />
                </QueueRow>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">{t("noViewings")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{t("onSale")}</h2>
        <ul className="flex flex-col border-b border-line">
          {homes.map((h) => {
            const status = h.saleStatus ?? "onMarket";
            return (
              <QueueRow
                key={h.id}
                muted={status === "sold"}
                summary={
                  <span className="flex items-center gap-4">
                    <SupplyImage seed={h.imageSeed} src={h.images?.[0]} alt="" sizes="72px" className="h-12 w-16 flex-none rounded-inner" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2"><StatusPill tone={SALE_TONE[status]}>{t(`sale.${status}`)}</StatusPill></span>
                      <span className="truncate text-[15px] font-semibold text-ink">{h.name}</span>
                      <span className="text-[13px] text-ink-3">{h.neighbourhood} · {t("viewingsCount", { count: viewings.filter((v) => v.saleId === h.id).length })}</span>
                    </span>
                    <span className="tnum hidden flex-none text-[15px] font-semibold text-ink sm:block">{formatMoney(h.price, intl)}</span>
                  </span>
                }
              >
                <SaleEditor id={h.id} priceMajor={h.price.minor / 10 ** exponentOf(h.price.currency)} currency={h.price.currency} status={status} />
                {status !== "sold" && <Link href={`/buy/${h.slug}`} className="self-start text-[14px] font-semibold text-brand hover:underline">{t("viewOnSite")}</Link>}
              </QueueRow>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
