import { getTranslations } from "next-intl/server";
import type { Page } from "@/lib/paginate";
import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Where you are in a list, and how to leave it.
 *
 * The range line is the part that earns its place. "Next" alone tells someone
 * there is more without telling them how much more, and a dashboard whose
 * lists have no bottom is one people stop trusting to have shown them
 * everything — which is the exact complaint that started this pass.
 *
 * Links rather than buttons, so a page is addressable, shareable and in
 * history. Exhausted directions render as spans rather than disabled links:
 * a disabled link is not a thing, and a focusable control that refuses to do
 * anything is worse than no control.
 *
 * Renders nothing at all on a single page. Chrome that only ever says "1–4 of
 * 4" is furniture pretending to be function.
 */
export async function Pager({
  page,
  hrefFor,
  className,
}: {
  page: Page<unknown>;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  const t = await getTranslations("pager");
  if (page.pages <= 1) return null;

  const step = "flex items-center gap-1.5 rounded-ctl px-3 py-2 text-sm font-semibold";

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4",
        className,
      )}
    >
      <p className="tnum text-[13px] text-ink-3">
        {t("range", { from: page.from, to: page.to, total: page.total })}
      </p>

      <div className="flex items-center gap-1">
        {page.hasPrevious ? (
          <Link href={hrefFor(page.page - 1)} className={cn(step, "text-brand hover:bg-surface-2")}>
            <ChevronLeftIcon size={15} />
            {t("previous")}
          </Link>
        ) : (
          <span className={cn(step, "text-ink-3 opacity-50")} aria-hidden="true">
            <ChevronLeftIcon size={15} />
            {t("previous")}
          </span>
        )}

        <span className="tnum px-2 text-[13px] text-ink-2">
          {t("pageOf", { page: page.page, pages: page.pages })}
        </span>

        {page.hasNext ? (
          <Link href={hrefFor(page.page + 1)} className={cn(step, "text-brand hover:bg-surface-2")}>
            {t("next")}
            <ChevronRightIcon size={15} />
          </Link>
        ) : (
          <span className={cn(step, "text-ink-3 opacity-50")} aria-hidden="true">
            {t("next")}
            <ChevronRightIcon size={15} />
          </span>
        )}
      </div>
    </nav>
  );
}
