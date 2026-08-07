"use client";

import { DateRangePicker } from "./date-range-picker";
import type { IsoDate } from "@/lib/domain/dates";

/**
 * One date, not a range.
 *
 * An experience happens on a day; there is no departure to pick. Rather than
 * maintain a second calendar, this drives the range picker with the same date
 * on both ends — so the grid, keyboard handling, locale week start, and brand
 * treatment all stay in one place, and a fix to any of them lands everywhere.
 */
export function SingleDatePicker({
  value,
  onChange,
  label,
  minDate,
  className,
}: {
  value: IsoDate | null;
  onChange: (date: IsoDate | null) => void;
  label: string;
  minDate?: IsoDate;
  className?: string;
}) {
  return (
    <DateRangePicker
      from={value}
      to={value}
      onChange={(from) => onChange(from)}
      minDate={minDate}
      labelFrom={label}
      labelTo={label}
      singleDate
      className={className}
    />
  );
}
