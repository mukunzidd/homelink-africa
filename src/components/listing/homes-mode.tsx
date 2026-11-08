import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BedIcon, HouseIcon, KeyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type HomesMode = "stay" | "rent" | "buy";

/**
 * Stay · Rent · Buy, at the top of every Homes page.
 *
 * Three answers to "for how long?": a night, a lease, for good. Each one
 * changes what a price means (per night, per month, the asking price) and what
 * the action is (reserve, apply, ask the team), so the switch sits above the
 * results it changes rather than among the filters that narrow them.
 *
 * On a wide screen it sits on the same line as the search, as a pill of the
 * same height and border, because the mode is the first part of the question
 * the search asks. Stacked above it, it read as page navigation.
 *
 * Links, not state: each mode is its own URL and the back button undoes it.
 * Switching carries the neighbourhood and bedrooms across, because a guest
 * comparing renting with buying in Kimihurura should not have to say
 * Kimihurura twice.
 */
export async function HomesModeSwitch({
  mode,
  carry,
  counts,
}: {
  mode: HomesMode;
  carry?: { neighbourhood?: string; bedrooms?: number };
  counts?: Partial<Record<HomesMode, number>>;
}) {
  const t = await getTranslations("homes");

  const query = (extra: Record<string, string>) => {
    const p = new URLSearchParams(extra);
    if (carry?.neighbourhood) p.set("neighbourhood", carry.neighbourhood);
    if (carry?.bedrooms) p.set("bedrooms", String(carry.bedrooms));
    return p.size ? `?${p}` : "";
  };

  const modes = [
    { key: "stay" as const, icon: BedIcon, href: `/stays${query({})}` },
    { key: "rent" as const, icon: KeyIcon, href: `/stays${query({ band: "long" })}` },
    { key: "buy" as const, icon: HouseIcon, href: `/buy${query({})}` },
  ];

  return (
    <nav
      aria-label={t("modeLabel")}
      className="flex w-full flex-none gap-1 rounded-full border border-line bg-surface p-1.5 shadow-[var(--shadow-card)] sm:w-fit lg:h-[66px]"
    >
      {modes.map(({ key, icon: Icon, href }) => {
        const active = key === mode;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            title={t(`modeUnit.${key}`)}
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[14px] transition-colors duration-150 sm:flex-none sm:gap-2 sm:px-4 lg:h-full",
              active
                ? "bg-brand-tint font-semibold text-brand-deep"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon size={16} className={active ? "text-brand-deep" : "text-ink-3"} />
            <span className="truncate">{t(`mode.${key}`)}</span>
            {counts?.[key] !== undefined && (
              <span className={cn("tnum hidden font-mono text-[12px] min-[420px]:inline", active ? "text-brand-deep/70" : "text-ink-3")}>{counts[key]}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
