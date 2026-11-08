import { Link } from "@/i18n/navigation";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * Where you are, one level at a time, on every page below a lane's index.
 *
 * Replaces the single "← All stays" link. That said where back went but not
 * where you were, and from a checkout it went to the wrong place: all stays,
 * not the listing being booked.
 */
export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="rounded-inner transition-colors duration-150 hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "truncate text-ink-2" : undefined}>
                  {crumb.label}
                </span>
              )}
              {!last && <ChevronRightIcon size={12} className="text-ink-3/70" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
