import type { ReactNode } from "react";

/**
 * The top of every workspace page: what this is, one line on what it is for,
 * and the page's own actions on the right.
 *
 * Smaller than the public site's display headings on purpose. Staff open
 * these pages fifty times a day; the title is a label, not an introduction.
 */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{title}</h1>
        {description && (
          <p className="max-w-[70ch] text-[14px] leading-relaxed text-ink-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
