"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/cn";

/**
 * A real listbox, not a native `<select>`.
 *
 * The native element can be styled shut but not open: its option list is drawn
 * by the operating system and ignores every token in this system, so a dark
 * theme still got a white menu with the platform's own highlight colour. That
 * is the one part of a form people actually look at while choosing.
 *
 * So this implements the ARIA listbox pattern properly rather than half-using
 * a control that cannot be finished:
 *   - `aria-activedescendant` for roving focus, so the button keeps DOM focus
 *   - full keyboard: arrows, Home, End, Enter, Space, Escape, and type-ahead
 *   - Escape and outside-press close, restoring focus to the trigger
 * Everything a native select gives for free is reimplemented here on purpose.
 */

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  /** Optional second line, e.g. a hint under the label. */
  hint?: string;
};

export function Select<T extends string | number>({
  label,
  hideLabel,
  value,
  onChange,
  options,
  icon,
  disabled,
  className,
  size = "md",
  variant = "standalone",
}: {
  label: string;
  hideLabel?: boolean;
  value: T;
  onChange: (next: string) => void;
  options: SelectOption<T>[];
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  /**
   * `field` puts the label inside the control, matching the search bar's other
   * inputs. `standalone` stacks the label above, for forms and filter rails.
   */
  variant?: "standalone" | "field";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useDismissable(rootRef, open, () => close());

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function openList() {
    if (disabled) return;
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(String(option.value));
    close();
  }

  // Keep the highlighted option in view when arrowing past the visible edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  /** Type-ahead: jump to the first option starting with what was typed. */
  const typed = useRef({ buffer: "", at: 0 });
  function typeAhead(key: string) {
    const now = performance.now();
    typed.current.buffer =
      now - typed.current.at > 600 ? key : typed.current.buffer + key;
    typed.current.at = now;

    const needle = typed.current.buffer.toLowerCase();
    const found = options.findIndex((o) =>
      o.label.toLowerCase().startsWith(needle),
    );
    if (found >= 0) {
      setActiveIndex(found);
      if (!open) commit(found);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = options.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) return openList();
        return setActiveIndex((i) => Math.min(i + 1, last));
      case "ArrowUp":
        event.preventDefault();
        if (!open) return openList();
        return setActiveIndex((i) => Math.max(i - 1, 0));
      case "Home":
        if (!open) return;
        event.preventDefault();
        return setActiveIndex(0);
      case "End":
        if (!open) return;
        event.preventDefault();
        return setActiveIndex(last);
      case "Enter":
      case " ":
        event.preventDefault();
        return open ? commit(activeIndex) : openList();
      case "Tab":
        if (open) close(false);
        return;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          typeAhead(event.key);
        }
    }
  }

  const selected = options[selectedIndex];
  const isField = variant === "field";

  return (
    <div ref={rootRef} className={cn("relative", isField ? "flex" : "", className)}>
      {!isField && (
        <label
          htmlFor={`${baseId}-trigger`}
          className={cn(
            "mb-1.5 block text-[13px] font-semibold text-ink-2",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={`${baseId}-trigger`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-list` : undefined}
        aria-activedescendant={open ? `${baseId}-opt-${activeIndex}` : undefined}
        aria-label={isField || hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface text-left",
          "transition-colors duration-150 hover:bg-surface-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-brand",
          isField
            ? "min-h-11 flex-col justify-center gap-0.5 px-3 py-2"
            : size === "sm"
              ? "min-h-9 px-2.5"
              : "min-h-11 px-3",
        )}
      >
        {isField ? (
          <>
            <span className="flex w-full items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-3">
              {icon}
              {label}
            </span>
            <span className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-[15px] font-medium text-ink">
                {selected?.label ?? ""}
              </span>
              <ChevronDownIcon className="flex-none text-ink-3" />
            </span>
          </>
        ) : (
          <>
            {icon && <span className="flex-none text-ink-3">{icon}</span>}
            <span
              className={cn(
                "flex-1 truncate font-medium text-ink",
                size === "sm" ? "text-[13px]" : "text-[15px]",
              )}
            >
              {selected?.label ?? ""}
            </span>
            <ChevronDownIcon className="flex-none text-ink-3" />
          </>
        )}
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={cn(
            "absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-64 min-w-full overflow-y-auto",
            "rounded-ctl border border-line bg-surface p-1 shadow-[var(--shadow-pop)]",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <li
                key={option.value}
                id={`${baseId}-opt-${index}`}
                role="option"
                data-index={index}
                aria-selected={isSelected}
                onClick={() => commit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-[6px] px-2.5 py-2 text-[14px]",
                  "transition-colors duration-100",
                  isActive && !isSelected && "bg-surface-2 text-ink",
                  isSelected && "bg-brand-tint font-semibold text-brand",
                  !isActive && !isSelected && "text-ink",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {option.label}
                  {isSelected && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      className="flex-none"
                    >
                      <path
                        d="M3.5 8.4l3 3 6-6.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {option.hint && (
                  <span className="text-xs text-ink-3">{option.hint}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
