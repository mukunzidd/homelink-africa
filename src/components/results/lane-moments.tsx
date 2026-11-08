import { getTranslations } from "next-intl/server";
import type { Money } from "@/lib/domain/money";
import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";
import { MoneyText } from "@/components/ui/money-text";
import { ScrollStrip } from "@/components/results/scroll-strip";
import { cn } from "@/lib/cn";

/**
 * The one rich thing on each list page.
 *
 * Five list pages differed only in their data, so none of them felt like a
 * place. Each lane now gets one moment drawn from what it is actually about,
 * and everything around it stays quiet: Stay gets the neighbourhoods, Rent the
 * going rate in each, Buy the price per square metre against the median.
 */

export type NeighbourhoodTile = {
  name: string;
  count: number;
  from: Money;
  image?: string;
  seed: string;
  href: string;
  active: boolean;
};

/** Stay: a band of neighbourhoods with a photograph and a "from" price. */
export async function NeighbourhoodBand({ tiles }: { tiles: NeighbourhoodTile[] }) {
  const t = await getTranslations("list");
  return (
    <ScrollStrip label={t("bandLabel")} backLabel={t("bandBack")} moreLabel={t("bandMore")}>
      <ul className="flex gap-3 pb-1">
        {tiles.map((n) => (
          <li key={n.name} className="flex-none">
            <Link
              href={n.href}
              scroll={false}
              aria-current={n.active ? "true" : undefined}
              className={cn(
                "group flex w-40 flex-col overflow-hidden rounded-card border bg-surface transition-colors duration-150",
                n.active ? "border-brand ring-1 ring-brand" : "border-line hover:border-ink-3/40",
              )}
            >
              <SupplyImage seed={n.seed} src={n.image} alt="" sizes="160px" className="h-20 w-full" />
              <span className="flex flex-col gap-0.5 px-3 py-2">
                <span className="truncate text-[14px] font-semibold text-ink">{n.name}</span>
                <span className="truncate text-[12px] text-ink-3">
                  {t("fromShort")} <MoneyText amount={n.from} rounded className="font-medium text-ink-2" /> · {t("placesShort", { count: n.count })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ScrollStrip>
  );
}

export type PriceBar = {
  label: string;
  /** What the bar measures; compared within one currency. */
  value: Money;
  note?: string;
  href?: string;
  active?: boolean;
};

/** Stacked on a phone (label and figure, bar beneath), one line from `sm`. */
const BAR_ROW = "grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-1 py-0.5 sm:flex sm:gap-3 sm:py-0";

/**
 * A ranked list with thin bars. Used for the going monthly rate by
 * neighbourhood in Rent, and price per m² by home in Buy. A list with bars
 * rather than a chart: it is a comparison of a dozen named things, and the
 * names are the point.
 */
export async function PriceBars({
  title,
  caption,
  bars,
  marker,
  unit,
}: {
  title: string;
  caption: string;
  bars: PriceBar[];
  /** A reference line, such as the median, drawn across every bar. */
  marker?: { value: Money; label: string };
  unit?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value.minor), marker?.value.minor ?? 0);
  const pct = (m: Money) => `${Math.max(4, Math.round((m.minor / max) * 100))}%`;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="text-[13px] text-ink-3">{caption}</p>
      </div>
      {/* Below `sm` a 160px label and a 96px figure left the bar about 20px
          of a 390px screen, so there the label and figure share a line and
          the bar runs full width under them. Two columns wait for `lg`: at
          tablet widths a half-width column had the same squeeze. */}
      <ul className="grid gap-x-8 gap-y-2.5 sm:gap-y-1.5 lg:grid-cols-2">
        {bars.map((b) => {
          const inner = (
            <>
              <span className={cn("min-w-0 truncate text-[13px] sm:w-40 sm:flex-none", b.active ? "font-semibold text-ink" : "text-ink-2")}>{b.label}</span>
              <span className="relative order-last col-span-2 h-2 rounded-full bg-surface-2 sm:order-none sm:flex-1">
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-full", b.active ? "bg-brand" : "bg-ink-3/45")}
                  style={{ width: pct(b.value) }}
                />
                {marker && (
                  <span aria-hidden="true" className="absolute -inset-y-1 w-px bg-ink-2/60" style={{ left: pct(marker.value) }} />
                )}
              </span>
              <span className="tnum flex-none text-right text-[13px] text-ink sm:w-24">
                <MoneyText amount={b.value} rounded />
                {unit && <span className="text-ink-3"> {unit}</span>}
              </span>
            </>
          );
          return (
            <li key={b.label}>
              {b.href ? (
                <Link href={b.href} scroll={false} className={cn(BAR_ROW, "rounded-inner hover:bg-surface-2")}>
                  {inner}
                </Link>
              ) : (
                <div className={BAR_ROW}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {marker && (
        <p className="flex items-center gap-2 text-[12px] text-ink-3">
          <span aria-hidden="true" className="h-3 w-px bg-ink-2/60" />
          {marker.label} <MoneyText amount={marker.value} rounded className="text-ink-2" />
        </p>
      )}
    </section>
  );
}

/** Median of minor units; the inputs share one currency. */
export function medianMinor(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
