"use client";

import { useEffect, useRef, useState } from "react";
import { Select, type SelectOption } from "./select";
import { SingleDatePicker } from "./single-date-picker";
import type { IsoDate } from "@/lib/domain/dates";

/**
 * The brand's listbox and calendar, for plain forms.
 *
 * `Select` and `SingleDatePicker` are controlled and submit nothing, which
 * suits a search bar and not a server-action form that reads FormData. These
 * keep their own value, put it in a hidden input under `name`, and can submit
 * the form on change the way `onChange={e => e.currentTarget.form?.requestSubmit()}`
 * did on a native control. A native `<select>` or `<input type="date">` opens
 * the operating system's own list or calendar, which ignores every colour,
 * font and theme here; these do not.
 */

function useSubmitAfterChange<T>(value: T, input: React.RefObject<HTMLInputElement | null>) {
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    // After the render, so the hidden input already holds the new value.
    input.current?.form?.requestSubmit();
  }, [value, input]);
  return () => {
    pending.current = true;
  };
}

export function FormSelect<T extends string>({
  name,
  defaultValue,
  options,
  label,
  hideLabel,
  onChange,
  submitOnChange,
  disabled,
  size = "sm",
  className,
}: {
  name: string;
  defaultValue?: T;
  options: SelectOption<T>[];
  label: string;
  hideLabel?: boolean;
  onChange?: (value: T) => void;
  /** Submit the surrounding form as soon as a choice is made. */
  submitOnChange?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const [value, setValue] = useState<T>(defaultValue ?? options[0]?.value ?? ("" as T));
  const input = useRef<HTMLInputElement>(null);
  const armSubmit = useSubmitAfterChange(value, input);
  return (
    <>
      <Select
        label={label}
        hideLabel={hideLabel}
        value={value}
        options={options}
        disabled={disabled}
        size={size}
        className={className}
        onChange={(next) => {
          if (submitOnChange && next !== value) armSubmit();
          setValue(next as T);
          onChange?.(next as T);
        }}
      />
      <input ref={input} type="hidden" name={name} value={value} />
    </>
  );
}

/** Any day at all, for filters and records; pass `min` where the past is not allowed. */
const EARLIEST: IsoDate = "2000-01-01";

export function FormDate({
  name,
  defaultValue,
  label,
  min,
  onChange,
  submitOnChange,
  className,
}: {
  name: string;
  defaultValue?: IsoDate | null;
  label: string;
  min?: IsoDate;
  onChange?: (value: IsoDate | null) => void;
  submitOnChange?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState<IsoDate | null>(defaultValue || null);
  const input = useRef<HTMLInputElement>(null);
  const armSubmit = useSubmitAfterChange(value, input);
  return (
    <>
      <SingleDatePicker
        label={label}
        value={value}
        minDate={min ?? EARLIEST}
        className={className}
        onChange={(next) => {
          if (submitOnChange && next !== value) armSubmit();
          setValue(next);
          onChange?.(next);
        }}
      />
      <input ref={input} type="hidden" name={name} value={value ?? ""} />
    </>
  );
}
