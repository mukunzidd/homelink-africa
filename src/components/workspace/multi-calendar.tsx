"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { setNightBlocked } from "@/app/actions/portfolio";
import { useToast } from "@/components/notifications/toaster";
import { cn } from "@/lib/cn";

export type CalendarRow = {
  id: string;
  name: string;
  slug: string;
  /** One entry per day column. */
  days: { date: string; state: "free" | "blocked" | "repair" | "past" }[];
  bars: { id: string; reference: string; label: string; start: number; end: number; lane: number; tone: "stay" | "rent" | "ended" }[];
  lanes: number;
};

const DAY = 44;
const LANE = 30;

/**
 * Homes down the side, days across. The grid scrolls sideways inside its
 * own frame with the home column pinned, so the page never does. A bar is
 * a booking (its guest's name, a link to it); a hatched day is held; a
 * free day is held with a tap, by admin only.
 */
export function MultiCalendar({ rows, header, canBlock, todayIndex }: { rows: CalendarRow[]; header: { date: string; day: string; weekday: string; weekend: boolean }[]; canBlock: boolean; todayIndex: number }) {
  const t = useTranslations("workspace.calendar");
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const cols = `minmax(150px, 200px) repeat(${header.length}, ${DAY}px)`;

  async function hold(listingId: string, date: string, block: boolean) {
    setBusy(`${listingId}${date}`);
    const r = await setNightBlocked(listingId, date, block);
    setBusy(null);
    toast.show({ title: r.ok ? (block ? t("held") : t("released")) : t("cannot"), tone: r.ok ? "ok" : "crit" });
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-card border border-line bg-surface">
      <div className="min-w-max">
        <div className="sticky top-0 z-20 grid border-b border-line bg-surface" style={{ gridTemplateColumns: cols }}>
          <div className="sticky left-0 z-10 bg-surface px-3 py-2 text-[12px] font-medium text-ink-3">{t("home")}</div>
          {header.map((h, i) => (
            <div key={h.date} className={cn("flex flex-col items-center py-1.5 text-[11px]", h.weekend && "bg-surface-2/60", i === todayIndex && "text-brand")}>
              <span className="text-ink-3">{h.weekday}</span>
              <span className={cn("tnum font-semibold", i === todayIndex ? "grid size-6 place-items-center rounded-full bg-brand text-on-brand" : "text-ink")}>{h.day}</span>
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid border-b border-line-soft last:border-0" style={{ gridTemplateColumns: cols, gridTemplateRows: `repeat(${Math.max(1, r.lanes)}, ${LANE}px)` }}>
            <Link href={`/manage/portfolio/${r.slug}?tab=availability`} className="sticky left-0 z-10 flex items-center truncate border-r border-line-soft bg-surface px-3 text-[13px] font-medium text-ink hover:text-brand" style={{ gridRow: `1 / span ${Math.max(1, r.lanes)}` }}>
              <span className="truncate">{r.name}</span>
            </Link>
            {r.days.map((d, i) => {
              const style = { gridColumn: i + 2, gridRow: `1 / span ${Math.max(1, r.lanes)}` };
              const cls = cn(
                "border-l border-line-soft",
                header[i].weekend && "bg-surface-2/40",
                i === todayIndex && "bg-brand-tint/50",
                (d.state === "blocked" || d.state === "repair") && "[background-image:repeating-linear-gradient(45deg,transparent_0_5px,var(--line)_5px_7px)]",
                d.state === "repair" && "bg-warn-tint/60",
              );
              const free = d.state === "free";
              if (canBlock && (free || d.state === "blocked")) {
                return (
                  <button
                    key={d.date}
                    type="button"
                    style={style}
                    disabled={busy !== null}
                    aria-label={`${r.name}, ${d.date}: ${free ? t("tapToHold") : t("tapToRelease")}`}
                    title={free ? t("tapToHold") : t("tapToRelease")}
                    onClick={() => void hold(r.id, d.date, free)}
                    className={cn(cls, "cursor-pointer hover:bg-brand-tint", busy === `${r.id}${d.date}` && "animate-pulse")}
                  />
                );
              }
              return <div key={d.date} style={style} className={cls} title={d.state === "repair" ? t("repair") : d.state === "blocked" ? t("blocked") : undefined} />;
            })}
            {r.bars.map((b) => (
              <Link
                key={b.id}
                href={`/manage/bookings/${b.reference}`}
                title={`${b.label} · ${b.reference}`}
                style={{ gridColumn: `${b.start + 2} / ${b.end + 2}`, gridRow: b.lane + 1 }}
                className={cn(
                  "relative z-[5] mx-0.5 my-1 flex items-center truncate rounded-[6px] px-2 text-[12px] font-semibold",
                  b.tone === "stay" && "bg-brand text-on-brand hover:bg-brand-deep",
                  b.tone === "rent" && "bg-ink-2 text-surface hover:bg-ink",
                  b.tone === "ended" && "bg-brand/35 text-brand-deep hover:bg-brand/50",
                )}
              >
                <span className="truncate">{b.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
