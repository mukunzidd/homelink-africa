"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { setNightBlocked } from "@/app/actions/portfolio";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { useToast } from "@/components/notifications/toaster";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Night = { date: string; state: "free" | "booked" | "owner" | "maintenance" | "past" };

/**
 * One month of nights. A free night is held for the owner with a tap and
 * released with another; nights with guests and nights held for a repair
 * are shown but not changeable here (the booking or the ticket owns them).
 * Each tap saves at once, so this tab has no Save button.
 */
export function AvailabilityTab({ listingId, slug, month, nights, prev, next }: { listingId: string; slug: string; month: string; nights: Night[]; prev: string; next: string }) {
  const t = useTranslations("workspace.editor");
  const toast = useToast();
  const intl = INTL_LOCALES[useLocale() as Locale];
  const [busy, setBusy] = useState<string | null>(null);
  const title = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const dayName = (d: string) => new Intl.DateTimeFormat(intl, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const weekday = (i: number) => new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 2 + i)));
  // Monday-first grid; pad the first week.
  const lead = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const href = (m: string) => `/manage/portfolio/${slug}?tab=availability&month=${m}`;

  async function toggle(n: Night) {
    if (n.state !== "free" && n.state !== "owner") return;
    setBusy(n.date);
    const r = await setNightBlocked(listingId, n.date, n.state === "free");
    setBusy(null);
    toast.show({ title: r.ok ? (n.state === "free" ? t("held", { date: dayName(n.date) }) : t("released", { date: dayName(n.date) })) : t("cannotHold"), tone: r.ok ? "ok" : "crit" });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-ink-2">{t("availabilityHint")}</p>
      <div className="flex max-w-[560px] items-center justify-between">
        <Link href={href(prev)} aria-label={t("prevMonth")} className="grid size-9 place-items-center rounded-ctl border border-line text-ink-2 hover:border-brand"><ChevronLeftIcon size={16} /></Link>
        <h3 className="text-[16px] font-semibold capitalize text-ink">{title}</h3>
        <Link href={href(next)} aria-label={t("nextMonth")} className="grid size-9 place-items-center rounded-ctl border border-line text-ink-2 hover:border-brand"><ChevronRightIcon size={16} /></Link>
      </div>
      <div role="grid" aria-label={title} className="grid max-w-[560px] grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} role="columnheader" className="pb-1 text-center text-[12px] font-medium text-ink-3">{weekday(i)}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
        {nights.map((n) => {
          const day = Number(n.date.slice(8));
          const changeable = n.state === "free" || n.state === "owner";
          return (
            <button
              key={n.date}
              type="button"
              role="gridcell"
              disabled={!changeable || busy !== null}
              aria-label={`${dayName(n.date)}: ${t(`night.${n.state}`)}`}
              title={t(`night.${n.state}`)}
              onClick={() => void toggle(n)}
              className={cn(
                "flex aspect-square min-h-10 flex-col items-center justify-center rounded-ctl border text-[13px] font-semibold transition-colors",
                n.state === "free" && "cursor-pointer border-line bg-surface text-ink hover:border-brand",
                n.state === "owner" && "cursor-pointer border-ink-3 bg-ink-3/15 text-ink [background-image:repeating-linear-gradient(45deg,transparent_0_5px,rgba(0,0,0,0.06)_5px_7px)]",
                n.state === "booked" && "cursor-not-allowed border-brand/40 bg-brand-tint text-brand-deep",
                n.state === "maintenance" && "cursor-not-allowed border-warn/50 bg-warn-tint text-warn",
                n.state === "past" && "cursor-not-allowed border-transparent text-ink-3/50",
                busy === n.date && "animate-pulse",
              )}
            >
              <span className="tnum">{day}</span>
            </button>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-2">
        {(["free", "booked", "owner", "maintenance"] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-3.5 rounded-[4px] border", s === "free" && "border-line bg-surface", s === "booked" && "border-brand/40 bg-brand-tint", s === "owner" && "border-ink-3 bg-ink-3/15", s === "maintenance" && "border-warn/50 bg-warn-tint")} />
            {t(`night.${s}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
