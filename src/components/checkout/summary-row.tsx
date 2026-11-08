import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";

/**
 * What is being booked, in one row, at the top of a checkout on a phone.
 *
 * The full summary sits beside the form on a wide screen. Below lg the grid
 * stacks and the summary landed after the Pay button, about halfway down a
 * 2,960px page, so a guest paid before the page had told them what for. This
 * row answers that first; the full card stays where it is on desktop.
 */
export function SummaryRow({
  imageSeed,
  image,
  title,
  facts,
  changeHref,
  changeLabel,
}: {
  imageSeed: string;
  image?: string;
  title: string;
  /** Dates first, then who or how. Joined with a middle dot. */
  facts: string[];
  changeHref: string;
  changeLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 lg:hidden">
      <SupplyImage
        seed={imageSeed}
        src={image}
        alt=""
        sizes="64px"
        className="size-14 flex-none rounded-inner"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] font-semibold leading-snug text-ink">
          {title}
        </p>
        <p className="tnum text-[13px] text-ink-2">{facts.join(" · ")}</p>
      </div>
      <Link
        href={changeHref}
        className="flex min-h-11 flex-none items-center rounded-ctl px-2 text-sm font-semibold text-brand hover:text-brand-deep"
      >
        {changeLabel}
      </Link>
    </div>
  );
}
