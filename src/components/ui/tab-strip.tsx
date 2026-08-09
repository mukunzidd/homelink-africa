import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Sections of one screen, switched by the URL.
 *
 * Not `Segmented`, and the difference is not cosmetic. `Segmented` is a real
 * ARIA tablist because it swaps client state between two instruments already
 * on the page. These are navigations: they change what the server fetches, they
 * belong in history, and they have to survive being opened in a new tab. So
 * they are links in a `<nav>` with `aria-current`, not `role="tab"` — claiming
 * the tab pattern without tabpanels and roving focus is a worse lie than not
 * claiming it.
 *
 * The count rides in the tab because a dashboard's first question is "how much
 * is in there", and answering it only after a click is what makes a screen feel
 * like it is hiding things. A zero is shown rather than suppressed: an empty
 * section is information.
 */
export type Tab = {
  key: string;
  label: string;
  href: string;
  count?: number;
};

export function TabStrip({
  tabs,
  active,
  label,
  className,
}: {
  tabs: Tab[];
  active: string;
  /** Names the group for anyone not looking at it. */
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mx-1 overflow-x-auto", className)}>
      <ul className="flex min-w-max items-center gap-1 p-1">
        {tabs.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-ctl px-3.5 py-2 text-sm font-semibold",
                  "transition-colors duration-150",
                  current
                    ? "bg-surface-2 text-ink"
                    : "text-ink-3 hover:bg-surface-2/60 hover:text-ink",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "tnum rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                      current ? "bg-ink/10 text-ink-2" : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
