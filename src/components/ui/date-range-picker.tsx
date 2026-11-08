"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import {
  addDays,
  addMonths,
  formatDate,
  formatMonthTitle,
  isSameMonth,
  monthGrid,
  nightsBetween,
  startOfMonth,
  today,
  weekdayLabels,
  type IsoDate,
} from "@/lib/domain/dates";
import { useDismissable } from "@/lib/use-dismissable";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import {
  FIELD_SHELL,
  FieldContent,
  fieldShellState,
} from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

/**
 * Range picker, replacing the two native date inputs.
 *
 * `<input type="date">` is fine for a birthday and wrong for a stay: it is two
 * unrelated controls, so the browser cannot show that check-out must follow
 * check-in, cannot shade the nights between them, and cannot say how many
 * nights that is. It also arrives in the browser's own chrome — a blue accent
 * and a dark panel that ignore every token in this system.
 *
 * This is one control over two fields, on our tokens, in both themes.
 */

type Props = {
  from: IsoDate | null;
  to: IsoDate | null;
  onChange: (from: IsoDate | null, to: IsoDate | null) => void;
  minDate?: IsoDate;
  labelFrom: string;
  labelTo: string;
  /** Rendered when a side has no date yet. */
  placeholder?: string;
  /** One date rather than a range: shows a single field and closes on pick. */
  singleDate?: boolean;
  className?: string;
};

export function DateRangePicker({
  from,
  to,
  onChange,
  minDate,
  labelFrom,
  labelTo,
  placeholder,
  singleDate = false,
  className,
}: Props) {
  const t = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const intlLocale = INTL_LOCALES[locale];

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const min = minDate ?? today();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<"from" | "to">("from");
  const [view, setView] = useState<IsoDate>(() => startOfMonth(from ?? min));
  const [hovered, setHovered] = useState<IsoDate | null>(null);
  const [focused, setFocused] = useState<IsoDate>(() => from ?? min);
  const [align, setAlign] = useState<"start" | "end">("start");

  useDismissable(rootRef, open, () => setOpen(false));

  /**
   * Flip the popover to right-aligned when left-aligned would run past the
   * viewport. Two months is roughly 620px; the picker sits mid-row in the
   * search bar, so on narrower screens the default alignment pushed the page
   * into a horizontal scroll. Measured rather than guessed at a breakpoint,
   * because the trigger's x position depends on the surrounding layout.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const node = popoverRef.current;
    if (!node) return;

    setAlign("start");
    const rect = node.getBoundingClientRect();
    const overflowsRight = rect.left + node.offsetWidth > window.innerWidth - 8;
    if (overflowsRight) setAlign("end");
  }, [open, view]);

  // Keep the roving-focus cell in the DOM's focus, but only while the popover
  // is open — otherwise opening it would steal focus from the page.
  useEffect(() => {
    if (!open) return;
    const cell = gridRef.current?.querySelector<HTMLElement>('[data-focused="true"]');
    cell?.focus();
  }, [open, focused, view]);

  const weekdays = useMemo(() => weekdayLabels(intlLocale), [intlLocale]);
  const months = useMemo(
    () => [view, addMonths(view, 1)] as const,
    [view],
  );

  /** The end of the range being previewed, so hovering shades the nights. */
  const previewTo = to ?? (editing === "to" ? hovered : null);
  const rangeStart = from;
  const rangeEnd = previewTo && from && previewTo > from ? previewTo : to;

  function openAt(side: "from" | "to") {
    setEditing(side);
    const anchor = side === "to" ? (to ?? from ?? min) : (from ?? min);
    setView(startOfMonth(anchor));
    setFocused(anchor);
    setOpen(true);
  }

  function select(date: IsoDate) {
    if (date < min) return;

    if (singleDate) {
      onChange(date, date);
      setFocused(date);
      setOpen(false);
      return;
    }

    // Starting fresh, or the user clicked before the current check-in — either
    // way that click means "this is my new arrival date", not an error.
    if (editing === "from" || !from || date <= from) {
      onChange(date, to && date < to ? to : null);
      setEditing("to");
      setFocused(date);
      return;
    }

    onChange(from, date);
    setHovered(null);
    setOpen(false);
  }

  function moveFocus(days: number) {
    const next = addDays(focused, days);
    if (next < min) return;
    setFocused(next);
    if (!isSameMonth(next, view) && !isSameMonth(next, addMonths(view, 1))) {
      setView(startOfMonth(next));
    }
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
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
      moveFocus(moves[event.key]);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(focused);
    }
  }

  const nights = from && to ? nightsBetween(from, to) : 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="flex gap-2">
        {(
          singleDate
            ? ([{ side: "from", label: labelFrom, value: from }] as const)
            : ([
                { side: "from", label: labelFrom, value: from },
                { side: "to", label: labelTo, value: to },
              ] as const)
        ).map((field) => (
          <button
            key={field.side}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open && editing === field.side}
            aria-controls={open ? dialogId : undefined}
            onClick={() => openAt(field.side)}
            className={cn(
              FIELD_SHELL,
              "flex-1 cursor-pointer",
              fieldShellState(open && editing === field.side),
            )}
          >
            <FieldContent
              label={field.label}
              icon={<CalendarIcon size={15} />}
            >
              <span className={cn("block truncate", !field.value && "text-ink-3")}>
                {field.value
                  ? formatDate(field.value, intlLocale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : (placeholder ?? t("addDate"))}
              </span>
            </FieldContent>
          </button>
        ))}
      </div>

      {open && (
        <div
          ref={popoverRef}
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={editing === "from" ? labelFrom : labelTo}
          className={cn(
            "absolute z-50 mt-2 w-max rounded-card",
            "border border-line bg-surface p-4 shadow-[var(--shadow-pop)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <button
              type="button"
              aria-label={t("previousMonth")}
              disabled={startOfMonth(min) >= view}
              onClick={() => setView(addMonths(view, -1))}
              className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeftIcon />
            </button>

            <div className="flex flex-1 justify-around gap-6">
              {months.map((month, index) => (
                <p
                  key={month}
                  aria-hidden={index === 1 ? "true" : undefined}
                  className={cn(
                    "text-center font-display text-lg font-semibold text-ink",
                    index === 1 && "hidden sm:block",
                  )}
                >
                  {formatMonthTitle(month, intlLocale)}
                </p>
              ))}
            </div>

            <button
              type="button"
              aria-label={t("nextMonth")}
              onClick={() => setView(addMonths(view, 1))}
              className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div
            ref={gridRef}
            onKeyDown={onGridKeyDown}
            onMouseLeave={() => setHovered(null)}
            className="flex gap-6"
          >
            {months.map((month, index) => (
              <div
                key={month}
                className={index === 1 ? "hidden sm:block" : "block"}
              >
              <MonthGrid
                month={month}
                locale={intlLocale}
                weekdays={weekdays}
                min={min}
                from={rangeStart}
                to={rangeEnd}
                focused={focused}
                onSelect={select}
                onHover={setHovered}
              />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
            {singleDate ? (
              <p className="text-[13px] text-ink-2">{labelFrom}</p>
            ) : nights > 0 ? (
              <p className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-semibold text-brand">
                {t("nightsSelected", { count: nights })}
              </p>
            ) : (
              <p className="text-[13px] text-ink-2">
                {editing === "from" ? t("pickArrival") : t("pickDeparture")}
              </p>
            )}

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null, null);
                  setEditing("from");
                }}
                className="cursor-pointer rounded-ctl px-2.5 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {t("clear")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-ctl bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-colors hover:bg-brand-deep"
              >
                {t("done")}
              </button>
            </div>
          </div>
        </div>
      )}
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
  onHover: (date: IsoDate | null) => void;
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

        return (
          <div key={cell.date} role="gridcell" className="relative">
            {/* The connecting band sits behind the day so a selected range
                reads as one continuous stretch rather than separate pills. */}
            {(inRange || (isEdge && !!from && !!to && from !== to)) && (
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
              onMouseEnter={() => !disabled && onHover(cell.date)}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-full text-[13px] tabular-nums",
                "transition-colors duration-100",
                disabled && "cursor-not-allowed text-ink-3/35",
                !disabled && !isEdge && "cursor-pointer text-ink hover:bg-surface-2",
                !disabled && inRange && "font-medium text-brand",
                isEdge && "bg-brand font-semibold text-on-brand shadow-[var(--shadow-card)] hover:bg-brand-deep",
                // Today is ringed rather than filled: a ring is never a
                // selection anywhere in this system, so the two cannot be
                // confused when today also happens to be the arrival date.
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
