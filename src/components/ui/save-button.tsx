"use client";

import { useTranslations } from "next-intl";
import { useSaved, type SavedKind } from "@/lib/saved";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The heart. Two looks for two places: a round chip that sits on a
 * photograph, and a labelled button in the header of a detail page, where
 * there is room to say what it does.
 */
export function SaveButton({
  id,
  kind,
  name,
  variant = "overlay",
  size = "md",
  className,
}: {
  id: string;
  kind: SavedKind;
  name: string;
  variant?: "overlay" | "inline";
  /** `compact` is 28px below `sm` and the usual 36px above it. */
  size?: "md" | "compact";
  className?: string;
}) {
  const t = useTranslations("saved");
  const { has, toggle } = useSaved();
  const saved = has(id);

  const heart = (
    <HeartIcon
      size={variant === "overlay" ? 18 : 16}
      className={cn(
        "transition-transform duration-150",
        // CSS size beats the SVG's width attribute, so the icon can shrink
        // with the chip at the same breakpoint.
        variant === "overlay" && size === "compact" && "size-[15px] sm:size-[18px]",
        saved && "scale-110 fill-current",
      )}
    />
  );

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("removeNamed", { name }) : t("saveNamed", { name })}
      title={saved ? t("remove") : t("save")}
      onClick={(e) => {
        // Cards are links. The heart must not navigate.
        e.preventDefault();
        e.stopPropagation();
        toggle(id, kind);
      }}
      className={cn(
        "cursor-pointer transition-colors duration-150",
        variant === "overlay"
          ? cn(
              "grid place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-card)] backdrop-blur",
              size === "compact" ? "h-7 w-7 sm:h-9 sm:w-9" : "h-9 w-9",
              saved ? "text-crit" : "text-ink hover:text-crit",
            )
          : cn(
              "inline-flex min-h-9 items-center gap-2 rounded-ctl border border-line bg-surface px-3 text-sm font-semibold",
              saved ? "text-crit" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            ),
        className,
      )}
    >
      {heart}
      {variant === "inline" && <span>{saved ? t("saved") : t("save")}</span>}
    </button>
  );
}
