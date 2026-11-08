"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useDismissable } from "@/lib/use-dismissable";
import { SearchIcon, SlidersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The segmented search pill for Cars, Experiences and Buy, matching Stay's.
 *
 * Those three bars were native `<input type="date">` and `<select>` dressed
 * in the pill's border. The browser drew the rest: a dd/mm/yyyy mask with a
 * highlighted day, an OS calendar in the system font, an option list in light
 * mode over a dark page. Every lane now opens the same panels from the same
 * segments, so learning the Stay search teaches all four.
 *
 * Segments that share a key open the same panel, which is how Pick up and
 * Return can be one range calendar while still reading as two fields.
 */
export type PillSegment = {
  key: string;
  /** The panel this segment opens; defaults to its own key. */
  panel?: string;
  label: string;
  value: string;
  filled: boolean;
  flex?: string;
};

export type PillPanel = {
  key: string;
  body: ReactNode;
  align?: "left" | "center" | "right";
  clear?: { label: string; onClear: () => void; disabled: boolean };
};

export function PillSearch({
  segments,
  panels,
  onSubmit,
  mobileTitle,
  mobileSummary,
}: {
  segments: PillSegment[];
  panels: PillPanel[];
  onSubmit: () => void;
  mobileTitle: string;
  mobileSummary: string;
}) {
  const t = useTranslations("searchPanel");
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpenPanel] = useState<string | null>(null);
  // The segment that opened the panel, so Pick up and Return light up one at
  // a time even though they share a calendar.
  const [from, setFrom] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useDismissable(rootRef, open !== null, () => setOpen(null));

  const panelOf = (s: PillSegment) => s.panel ?? s.key;
  const order = [...new Set(segments.map(panelOf))];
  const current = panels.find((p) => p.key === open);
  const nextPanel = open ? order[order.indexOf(open) + 1] : undefined;
  const dim = open !== null;
  const last = segments[segments.length - 1];

  function setOpen(panel: string | null, segmentKey?: string) {
    setOpenPanel(panel);
    setFrom(panel ? (segmentKey ?? segments.find((x) => panelOf(x) === panel)?.key ?? null) : null);
  }

  function submit() {
    setOpen(null);
    onSubmit();
  }

  const toggle = (s: PillSegment) => (from === s.key ? setOpen(null) : setOpen(panelOf(s), s.key));

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-full border border-line bg-surface py-2 pl-4 pr-2 text-left shadow-[var(--shadow-card)] sm:hidden"
        >
          <SearchIcon size={17} className="text-ink-2" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-semibold text-ink">{mobileTitle}</span>
            <span suppressHydrationWarning className="truncate text-[13px] text-ink-3">{mobileSummary}</span>
          </span>
          <span className="grid size-9 flex-none place-items-center rounded-full border border-line text-ink-2">
            <SlidersIcon size={15} />
          </span>
        </button>
      )}

      <div
        className={cn(
          "flex-col rounded-card border border-line shadow-[var(--shadow-card)] transition-colors duration-200 sm:flex sm:flex-row sm:items-stretch sm:rounded-full",
          expanded ? "flex" : "hidden",
          dim ? "bg-surface-2" : "bg-surface",
        )}
      >
        {segments.slice(0, -1).map((s, i) => (
          <div key={s.key} className={cn("flex items-stretch", s.flex ?? "sm:flex-1")}>
            <Segment segment={s} active={from === s.key} dim={dim} onClick={() => toggle(s)} first={i === 0} />
            <span
              aria-hidden="true"
              className={cn("hidden w-px flex-none self-center bg-line transition-opacity duration-200 sm:block sm:h-8", dim && "opacity-0")}
            />
          </div>
        ))}

        <div
          className={cn(
            "flex items-center gap-2 rounded-full pr-2",
            last.flex ?? "sm:flex-1",
            open === panelOf(last) && "bg-surface shadow-[var(--shadow-card)]",
          )}
        >
          <Segment segment={last} active={false} dim={dim && open !== panelOf(last)} onClick={() => toggle(last)} bare />
          <button
            type="button"
            onClick={submit}
            aria-label={t("search")}
            className={cn(
              "m-2 flex h-12 flex-none cursor-pointer items-center justify-center gap-2 rounded-full",
              "bg-brand text-on-brand transition-all duration-200 hover:bg-brand-deep",
              dim ? "px-5" : "w-12 px-0",
            )}
          >
            <SearchIcon size={17} />
            {dim && <span className="text-[15px] font-semibold">{t("search")}</span>}
          </button>
        </div>
      </div>

      {current && (
        <div
          className={cn(
            "absolute z-50 mt-3 w-max max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface shadow-[var(--shadow-pop)]",
            (current.align ?? "left") === "left" && "left-0",
            current.align === "center" && "left-1/2 -translate-x-1/2",
            current.align === "right" && "right-0",
          )}
        >
          {current.body}
          <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5">
            {current.clear ? (
              <button
                type="button"
                onClick={current.clear.onClear}
                disabled={current.clear.disabled}
                className={cn(
                  "rounded-ctl px-2 py-1.5 text-[14px] font-semibold underline underline-offset-4 transition-colors duration-150",
                  current.clear.disabled ? "cursor-not-allowed text-ink-3/45 no-underline" : "cursor-pointer text-ink-2 hover:text-ink",
                )}
              >
                {current.clear.label}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => (nextPanel ? setOpen(nextPanel) : submit())}
              className="cursor-pointer rounded-ctl bg-brand px-5 py-2.5 text-[14px] font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-deep"
            >
              {nextPanel ? t("next") : t("search")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Segment({
  segment,
  active,
  dim,
  onClick,
  bare,
  first,
}: {
  segment: PillSegment;
  active: boolean;
  dim: boolean;
  onClick: () => void;
  bare?: boolean;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 px-6 py-2 text-left transition-colors duration-200",
        !bare && "rounded-full",
        !bare && active && "bg-surface shadow-[var(--shadow-card)]",
        !bare && !active && dim && "hover:bg-surface/60",
        !bare && !active && !dim && "hover:bg-surface-2",
        first && "sm:rounded-l-full",
      )}
    >
      <span className="text-[12px] font-semibold text-ink">{segment.label}</span>
      <span suppressHydrationWarning className={cn("truncate text-[14px]", segment.filled ? "font-medium text-ink" : "text-ink-3")}>
        {segment.value}
      </span>
    </button>
  );
}

/** A list of choices inside a panel: one row each, the chosen one ticked. */
export function ChoiceList<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-col gap-1 p-2", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value || "any"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-6 rounded-inner px-3 py-2 text-left text-[14px] transition-colors duration-150",
              on ? "bg-brand-tint font-medium text-brand-deep" : "text-ink hover:bg-surface-2",
            )}
          >
            <span className="flex flex-col">
              <span>{o.label}</span>
              {o.hint && <span className="text-[12px] font-normal text-ink-3">{o.hint}</span>}
            </span>
            <span
              aria-hidden="true"
              className={cn("grid size-4 flex-none place-items-center rounded-full border", on ? "border-brand bg-brand" : "border-line")}
            >
              {on && <span className="size-1.5 rounded-full bg-on-brand" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
