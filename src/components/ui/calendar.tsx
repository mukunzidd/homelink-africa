"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  formatMonthTitle,
  isSameMonth,
  monthGrid,
  startOfMonth,
  today,
  weekdayLabels,
  type IsoDate,
} from "@/lib/domain/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The calendar body: month navigation and one or two month grids.
 *
 * Separated from any trigger because two different surfaces need it — the
 * booking panel's two-field range trigger, and the search bar's When panel,
 * which has no fields of its own. Keeping one implementation means the locale
 * week start, the keyboard model, and the range shading can only be right or
 * wrong in one place.
 */
export function Calendar({
  from,
  to,
  onSelect,
  onHover,
  hovered,
  minDate,
  locale,
  labels,
  months = 2,
}: {
  from: IsoDate | null;
  to: IsoDate | null;
  onSelect: (date: IsoDate) => void;
  onHover?: (date: IsoDate | null) => void;
  hovered?: IsoDate | null;
  minDate?: IsoDate;
  locale: string;
  labels: { previousMonth: string; nextMonth: string };
  months?: 1 | 2;
}) {
  const min = minDate ?? today();
  const gridRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<IsoDate>(() => startOfMonth(from ?? min));
  const [focused, setFocused] = useState<IsoDate>(() => from ?? min);

  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const shown = useMemo(
    () => (months === 2 ? [view, addMonths(view, 1)] : [view]),
    [view, months],
  );

  // Roving focus follows the arrow keys, but only once the grid owns focus.
  useEffect(() => {
    const active = document.activeElement;
    if (!gridRef.current?.contains(active)) return;
    gridRef.current
      .querySelector<HTMLElement>('[data-focused="true"]')
      ?.focus();
  }, [focused, view]);

  function moveFocus(days: number) {
    const next = addDays(focused, days);
    if (next < min) return;
    setFocused(next);
    if (!shown.some((m) => isSameMonth(next, m))) setView(startOfMonth(next));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -28,
      PageDown: 28,
    };
    if (event.key in moves) {
      event.preventDefault();
      return moveFocus(moves[event.key]);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(focused);
    }
  }

  /** Hovering after picking an arrival shades the nights it would cover. */
  const previewEnd =
    to ?? (from && hovered && hovered > from ? hovered : null);

  const navButton = cn(
    "grid size-9 cursor-pointer place-items-center rounded-full text-ink-2",
    "transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          aria-label={labels.previousMonth}
          disabled={startOfMonth(min) >= view}
          onClick={() => setView(addMonths(view, -1))}
          className={navButton}
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex flex-1 justify-around gap-8">
          {shown.map((month, index) => (
            <p
              key={month}
              className={cn(
                "text-center font-display text-lg font-semibold text-ink",
                index === 1 && "hidden sm:block",
              )}
            >
              {formatMonthTitle(month, locale)}
            </p>
          ))}
        </div>

        <button
          type="button"
          aria-label={labels.nextMonth}
          onClick={() => setView(addMonths(view, 1))}
          className={navButton}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div
        ref={gridRef}
        onKeyDown={onKeyDown}
        onMouseLeave={() => onHover?.(null)}
        className="flex justify-center gap-8"
      >
        {shown.map((month, index) => (
          <div
            key={month}
            className={index === 1 ? "hidden sm:block" : "block"}
          >
            <MonthGrid
              month={month}
              locale={locale}
              weekdays={weekdays}
              min={min}
              from={from}
              to={previewEnd}
              focused={focused}
              onSelect={(date) => {
                setFocused(date);
                onSelect(date);
              }}
              onHover={onHover}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  locale,
  weekdays,
  min,
  from,
  to,
  focused,
  onSelect,
  onHover,
}: {
  month: IsoDate;
  locale: string;
  weekdays: string[];
  min: IsoDate;
  from: IsoDate | null;
  to: IsoDate | null;
  focused: IsoDate;
  onSelect: (date: IsoDate) => void;
  onHover?: (date: IsoDate | null) => void;
}) {
  const cells = useMemo(() => monthGrid(month, locale), [month, locale]);
  const now = today();

  return (
    <div
      role="grid"
      aria-label={formatMonthTitle(month, locale)}
      className="grid grid-cols-7 gap-y-0.5"
    >
      {weekdays.map((day, i) => (
        <div
          key={`${day}-${i}`}
          role="columnheader"
          aria-label={day}
          className="grid h-8 w-10 place-items-center text-[12px] font-medium text-ink-3"
        >
          {day}
        </div>
      ))}

      {cells.map((cell) => {
        const disabled = !cell.inMonth || cell.date < min;
        const isFrom = from === cell.date;
        const isTo = to === cell.date;
        const inRange = !!from && !!to && cell.date > from && cell.date < to;
        const isEdge = isFrom || isTo;
        const spans = !!from && !!to && from !== to;

        return (
          <div key={cell.date} role="gridcell" className="relative">
            {/* A band behind the days, so a selected range reads as one
                continuous stretch rather than separate pills. */}
            {(inRange || (isEdge && spans)) && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-1 bg-brand-tint",
                  inRange && "inset-x-0",
                  isFrom && "left-1/2 right-0 rounded-l-full",
                  isTo && "left-0 right-1/2 rounded-r-full",
                )}
              />
            )}

            <button
              type="button"
              tabIndex={cell.date === focused ? 0 : -1}
              data-focused={cell.date === focused}
              disabled={disabled}
              aria-selected={isEdge}
              aria-current={cell.date === now ? "date" : undefined}
              onClick={() => onSelect(cell.date)}
              onMouseEnter={() => !disabled && onHover?.(cell.date)}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-full text-[13px] tabular-nums",
                "transition-colors duration-100",
                disabled && "cursor-not-allowed text-ink-3/35",
                !disabled && !isEdge && "cursor-pointer text-ink hover:bg-surface-2",
                !disabled && inRange && "font-medium text-brand",
                isEdge &&
                  "bg-brand font-semibold text-on-brand shadow-[var(--shadow-card)] hover:bg-brand-deep",
                // Today is ringed, never filled: a ring is never a selection
                // anywhere in this system, so the two cannot be confused.
                cell.date === now &&
                  !isEdge &&
                  "font-semibold text-brand ring-[1.5px] ring-inset ring-brand/45",
              )}
            >
              {Number(cell.date.slice(8))}
            </button>
          </div>
        );
      })}
    </div>
  );
}
