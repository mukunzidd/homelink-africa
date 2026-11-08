import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MapIcon } from "@/components/ui/icons";
import { RequestForm } from "@/components/results/request-form";

/**
 * The frame every list page shares.
 *
 * Homes led with a count ("12 verified places in Kigali") while Cars and Days
 * out led with a bare noun ("Cars"), so moving between lanes changed what the
 * top of the page meant. Every lane now says the same three things in the same
 * places: how many and of what, one line of what is promised, then the
 * controls, which stay in reach under the header while the list scrolls.
 */

export function ListHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-balance font-display text-2xl font-semibold leading-tight text-ink sm:text-[28px]">{title}</h1>
      {subtitle && <p className="max-w-[72ch] text-[14px] text-ink-2">{subtitle}</p>}
    </header>
  );
}

/**
 * Sticky under the site header. Left: what is filtered (chips). Right: view,
 * sort, and on a phone the filters button. The page background runs behind it
 * so rows scroll under rather than through.
 */
export function ListToolbar({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    // The background runs into the gutters so cards scroll under it edge to
    // edge, but the rule under it stops at the content edge like every other
    // line on the page; a border on this box drew it 24px past on each side.
    <div className="sticky top-[var(--header-offset)] z-30 -mx-6 bg-canvas/95 px-6 py-2.5 backdrop-blur after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-line-soft after:content-['']">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{start}</div>
        {end && <div className="flex w-full flex-none items-center gap-2 sm:w-auto">{end}</div>}
      </div>
    </div>
  );
}

/** The mini map that opens the map view, beside the filters. */
export async function MapPreviewLink({ href, children }: { href: string; children: ReactNode }) {
  const tMap = await getTranslations("map");
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-card border border-line">
      {children}
      <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--float-line)] bg-[var(--float-bg)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--float-ink)] shadow-[var(--shadow-pop)] transition-transform duration-150 group-hover:scale-[1.03]">
        <MapIcon size={14} />
        {tMap("showMap")}
      </span>
    </Link>
  );
}

/**
 * The end of a list, on purpose.
 *
 * Six homes for sale used to stop dead above a band of empty canvas, and four
 * cars in a three-column grid left one orphan. It then filled the rest of the
 * grid's last row, where it stretched to the height of the card beside it and
 * left half a dashed box empty; it now sits under the grid at full width, as
 * it does under the homes lists. Every list closes the same
 * way: how many that was, a way to tell the Kigali team what was missing
 * (which is also the cheapest demand research the product will ever get), and
 * the neighbouring lanes.
 */
export async function ListEnd({
  count,
  lane,
  others,
}: {
  count: number;
  lane: "stay" | "rent" | "buy" | "cars" | "experiences";
  others: { label: string; href: string }[];
}) {
  const t = await getTranslations("list");
  return (
    <section className="flex flex-col gap-4 rounded-card border border-dashed border-line bg-surface/60 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-[13px] text-ink-3">{t("endCount", { count })}</p>
        <h2 className="font-display text-xl font-semibold text-ink">{t(`endTitle.${lane}`)}</h2>
        <p className="max-w-[60ch] text-[14px] text-ink-2">{t("endBody")}</p>
      </div>
      <RequestForm lane={lane} />
      {others.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
          <span className="text-ink-3">{t("endOthers")}</span>
          {others.map((o) => (
            <Link key={o.href} href={o.href} className="font-medium text-brand hover:text-brand-deep">
              {o.label}
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}
