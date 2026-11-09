"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setRates } from "@/app/actions/portfolio";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays } from "@/lib/domain/dates";
import { useToast } from "@/components/notifications/toaster";
import { cn } from "@/lib/cn";
import { dateTimeFormat } from "@/lib/domain/date-format";

export type RateCell = { date: string; major: number; own: boolean; inMonth: boolean; past: boolean };

/**
 * A home's nights week by week, each with what it sells for. Tap a first
 * night and a last night to select them, then set one price for the lot or
 * put them back to the base. Weekends are shaded because that is where
 * prices usually move.
 */
export function RateGrid({ listingId, cells, base, currency }: { listingId: string; cells: RateCell[]; base: number; currency: string }) {
  const t = useTranslations("workspace.rates");
  const toast = useToast();
  const intl = INTL_LOCALES[useLocale() as Locale];
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const lo = a && b ? (a < b ? a : b) : a;
  const hi = a && b ? (a < b ? b : a) : a;
  const inSel = (d: string) => !!lo && !!hi && d >= lo && d <= hi;
  const num = new Intl.NumberFormat(intl, { maximumFractionDigits: 2 });
  const day = (d: string) => dateTimeFormat(intl, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const weekday = (i: number) => dateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 2 + i)));

  function pick(d: string) {
    if (!a || (a && b)) {
      setA(d);
      setB(null);
    } else setB(d);
  }

  async function apply(major: number | null) {
    if (!lo || !hi) return;
    setBusy(true);
    const r = await setRates(listingId, lo, addDays(hi, 1), major);
    setBusy(false);
    toast.show({ title: r.ok ? (major === null ? t("backToBase") : t("set")) : t("failed"), tone: r.ok ? "ok" : "crit" });
    if (r.ok) {
      setA(null);
      setB(null);
      setPrice("");
    }
  }

  const amount = Number(price.replace(/[\s,]/g, ""));
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div role="grid" className="grid min-w-[560px] grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} role="columnheader" className={cn("pb-1 text-center text-[12px] font-medium text-ink-3", i >= 5 && "text-ink-2")}>{weekday(i)}</span>
          ))}
          {cells.map((c, i) => {
            const weekend = i % 7 >= 5;
            const sel = inSel(c.date);
            return (
              <button
                key={c.date}
                type="button"
                role="gridcell"
                aria-selected={sel}
                disabled={c.past || busy}
                onClick={() => pick(c.date)}
                aria-label={`${day(c.date)}: ${num.format(c.major)} ${currency}${c.own ? ` (${t("own")})` : ""}`}
                className={cn(
                  "flex min-h-14 flex-col items-start justify-between rounded-ctl border px-2 py-1.5 text-left transition-colors",
                  !c.inMonth && "opacity-45",
                  c.past ? "cursor-not-allowed border-transparent bg-surface-2/50" : "cursor-pointer hover:border-brand",
                  weekend && !sel && "bg-surface-2",
                  !weekend && !sel && !c.past && "bg-surface",
                  c.own && !sel ? "border-brand/60" : "border-line",
                  sel && "border-brand bg-brand text-on-brand",
                )}
              >
                <span className={cn("tnum text-[11.5px]", sel ? "text-on-brand/80" : "text-ink-3")}>{Number(c.date.slice(8))}</span>
                <span className={cn("tnum text-[13px] font-semibold", sel ? "text-on-brand" : c.own ? "text-brand-deep" : "text-ink-2")}>{num.format(c.major)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        {lo ? (
          <>
            <p className="text-[14px] text-ink">
              {hi && hi !== lo ? t("selected", { from: day(lo), to: day(hi) }) : t("selectedOne", { date: day(lo) })}
              {!b && <span className="text-ink-3"> · {t("pickEnd")}</span>}
            </p>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (amount > 0) void apply(amount);
              }}
            >
              <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
                {t("price", { currency })}
                <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={num.format(base)} className="tnum min-h-10 w-40 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink focus:border-brand focus:outline-none" />
              </label>
              <button type="submit" disabled={busy || !(amount > 0)} className="min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand disabled:opacity-50">{t("setButton")}</button>
              <button type="button" disabled={busy} onClick={() => void apply(null)} className="min-h-10 cursor-pointer rounded-ctl border border-line px-4 text-[14px] font-semibold text-ink">{t("baseButton")}</button>
              <button type="button" onClick={() => { setA(null); setB(null); }} className="min-h-10 cursor-pointer rounded-ctl px-3 text-[14px] font-medium text-ink-2 hover:text-ink">{t("clear")}</button>
            </form>
          </>
        ) : (
          <p className="text-[14px] text-ink-3">{t("pickStart")}</p>
        )}
      </div>
    </div>
  );
}
