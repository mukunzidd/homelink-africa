"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSaved } from "@/lib/saved";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Saved places. The count is the reason to look; without it the heart is decoration. */
export function SavedLink() {
  const t = useTranslations("saved");
  const { items } = useSaved();
  const active = usePathname() === "/saved";

  return (
    <Link
      href="/saved"
      aria-label={items.length ? t("linkCount", { count: items.length }) : t("link")}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-ctl px-2 transition-colors duration-150",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      <HeartIcon className={cn(items.length > 0 && "fill-current text-crit")} />
      {/* Beside the heart, not on it: a badge over a 16px icon hid the
          icon and read as a bare black dot with a number. */}
      {items.length > 0 && <span className="tnum font-mono text-[13px] text-ink-2">{items.length}</span>}
    </Link>
  );
}
