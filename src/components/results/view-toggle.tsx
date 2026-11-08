"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ListIcon, MapIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** List or map. A link, not state: the view is part of what a shared URL shows. */
export function ViewToggle({ view }: { view: "list" | "map" }) {
  const t = useTranslations("map");
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (next: "list" | "map") => {
    const p = new URLSearchParams(params.toString());
    if (next === "map") p.set("view", "map");
    else p.delete("view");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const item = (key: "list" | "map", Icon: typeof ListIcon) => (
    <Link
      href={href(key)}
      scroll={false}
      aria-current={view === key ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-inner px-3 text-[13px] font-semibold transition-colors duration-150",
        view === key ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-3 hover:text-ink",
      )}
    >
      <Icon size={15} />
      <span className="sr-only sm:not-sr-only">{t(key)}</span>
    </Link>
  );

  return (
    <div className="inline-flex items-center gap-0.5 rounded-ctl border border-line bg-surface-2 p-0.5">
      {item("list", ListIcon)}
      {item("map", MapIcon)}
    </div>
  );
}
