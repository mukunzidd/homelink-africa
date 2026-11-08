import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { VerificationRecord } from "@/lib/domain/types";
import type { SavedKind } from "@/lib/saved";
import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";
import { SaveButton } from "@/components/ui/save-button";
import { ImageIcon } from "@/components/ui/icons";
import { InspectedBy } from "@/components/results/inspected-by";
import { cn } from "@/lib/cn";

/**
 * One anatomy for every result in every lane.
 *
 * Five list pages used to carry three card designs and five button styles: a
 * filled "Reserve", outlined "Apply" and "View", and full-width outlines for
 * cars and days out. Side by side they read as five products. Now there is one
 * card in two layouts, a row for homes and a tile for cars and days out, and
 * the parts always arrive in the same order: photo, title, facts, a line of
 * prose, the inspector, then the price and one quiet call to action.
 *
 * The whole card is the link (the title's ::after covers it), so the button is
 * a label rather than a second target, and the heart sits above the overlay.
 * Titles are set in the sans: the serif belongs to page headings, and a grid
 * of serif titles read like a magazine contents page.
 */

export type ResultCardProps = {
  href: string;
  title: string;
  /** Facts in one line, already joined. */
  meta: string;
  summary?: string;
  image: { seed: string; src?: string; count: number };
  save: { id: string; kind: SavedKind; name: string };
  inspection: VerificationRecord;
  /** Short state worth a pill: title checked, scarcity for chosen dates. */
  tags?: ReactNode;
  /** A line under the meta that only some lanes have: distance, departure. */
  extra?: ReactNode;
  price: ReactNode;
  cta: string;
  layout?: "row" | "tile";
  /** Ranked first on the page: loads its photograph eagerly. */
  priority?: boolean;
};

async function PhotoCount({ count }: { count: number }) {
  const t = await getTranslations("list");
  if (count < 2) return null;
  return (
    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
      <ImageIcon size={11} />
      {t("photos", { count })}
    </span>
  );
}

export async function ResultCard({
  href,
  title,
  meta,
  summary,
  image,
  save,
  inspection,
  tags,
  extra,
  price,
  cta,
  layout = "row",
  priority,
}: ResultCardProps) {
  const row = layout === "row";

  const body = (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", row ? "py-1" : "sm:px-4 sm:pt-3")}>
      <h3 className="text-[16px] font-semibold leading-snug text-ink">
        <Link
          href={href}
          className="rounded-ctl outline-none after:absolute after:inset-0 after:z-[1] after:rounded-card after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-brand"
        >
          {title}
        </Link>
      </h3>
      <p className="text-[13px] text-ink-3">{meta}</p>
      {extra}
      {summary && (
        <p className="line-clamp-2 max-w-[62ch] text-[13px] leading-relaxed text-ink-2">{summary}</p>
      )}
      {/* The inspector stays on the compact phone row too. It used to be
          dropped there to keep the row short, which removed the one line the
          product exists to say from exactly the cards a phone shows. */}
      <div className="mt-auto flex min-w-0 flex-col gap-2 pt-2">
        {tags && <div className="flex flex-wrap items-center gap-1.5">{tags}</div>}
        <InspectedBy record={inspection} />
      </div>
    </div>
  );

  const action = (
    <div
      className={cn(
        "flex flex-row items-end justify-between gap-3",
        row
          ? "border-t border-line-soft pt-3 sm:w-40 sm:flex-none sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-1"
          : // Wraps on the compact phone row: a longer label, such as the
            // Kinyarwanda for "Check dates", does not fit beside the price in
            // the ~190px beside the thumbnail and pushed past the screen edge.
            "flex-wrap items-center gap-y-2 pt-2 sm:mt-3 sm:flex-nowrap sm:items-end sm:border-t sm:border-line-soft sm:px-4 sm:py-3",
      )}
    >
      <div className={cn("flex flex-col items-start", row && "sm:items-end sm:text-right")}>{price}</div>
      <span
        aria-hidden="true"
        className="inline-flex min-h-9 flex-none items-center rounded-ctl border border-brand px-3.5 text-sm font-semibold text-brand transition-colors duration-150 group-hover:bg-brand group-hover:text-on-brand"
      >
        {cta}
      </span>
    </div>
  );

  return (
    <article
      className={cn(
        "group relative flex min-w-0 rounded-card border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-ink-3/40 hover:shadow-[var(--shadow-card)]",
        // A tile is a compact row on a phone: one car filling the whole
        // screen made a fleet of four a scroll of four screens.
        row ? "flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-4" : "flex-row gap-3 p-3 sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0",
      )}
    >
      <div className="relative flex-none">
        <SupplyImage
          seed={image.seed}
          src={image.src}
          alt=""
          priority={priority}
          sizes={row ? "(max-width: 640px) 100vw, 208px" : "(max-width: 640px) 112px, 33vw"}
          className={cn(
            row ? "h-44 w-full rounded-ctl sm:h-full sm:min-h-36 sm:w-52" : "h-28 w-28 rounded-ctl sm:h-48 sm:w-full sm:rounded-none",
          )}
        >
          <PhotoCount count={image.count} />
        </SupplyImage>
        {/* On the 112px phone thumbnail a 36px heart covered a third of the
            photograph, so the compact row gets a smaller one tucked into the
            corner. */}
        <span className={cn("absolute z-10", row ? "right-2 top-2" : "right-1 top-1 sm:right-2 sm:top-2")}>
          <SaveButton id={save.id} kind={save.kind} name={save.name} size={row ? "md" : "compact"} />
        </span>
      </div>

      {row ? (
        <>
          {body}
          {action}
        </>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          {body}
          {action}
        </div>
      )}
    </article>
  );
}

/** The price block every card uses: figure, then what it is for. */
export function PriceBlock({ figure, unit, sub }: { figure: ReactNode; unit: string; sub?: ReactNode }) {
  return (
    <>
      <span className="text-lg font-semibold leading-tight text-ink">{figure}</span>
      <span className="text-xs text-ink-3">{unit}</span>
      {sub && <span className="text-xs text-ink-3">{sub}</span>}
    </>
  );
}
