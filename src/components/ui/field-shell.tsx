import { cn } from "@/lib/cn";

/**
 * The one field geometry used by every control in a search bar.
 *
 * Alignment kept drifting because the four fields were three different things:
 * a `<label>` wrapping an input, two `<button>` triggers from the date picker,
 * and a `<button>` from the select. Each brought its own padding and its own
 * line box, so they lined up only by coincidence and stopped whenever any one
 * of them changed.
 *
 * The fix is structural rather than cosmetic. Everything here is fixed:
 * container height, label leading, and a value row of an exact height. An
 * input, a date, and a selected option therefore occupy identical boxes no
 * matter what element renders them.
 */

/** Applied to the container, whatever element that turns out to be. */
export const FIELD_SHELL = cn(
  "flex min-h-[60px] w-full flex-col justify-center gap-1 rounded-ctl border px-3.5 py-2",
  "text-left transition-colors duration-150",
);

export function fieldShellState(active?: boolean, interactive = true) {
  return cn(
    active ? "border-brand bg-brand-tint/40" : "border-line bg-surface",
    interactive && !active && "hover:bg-surface-2",
  );
}

export function FieldContent({
  label,
  icon,
  trailing,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  /** Right-hand affordance, e.g. a chevron. Never affects the value's baseline. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="block text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-ink-3">
        {label}
      </span>

      {/* Fixed height, not auto: an <input> and a <span> have different
          intrinsic line boxes, and letting them size themselves is exactly
          what knocked the fields out of alignment. */}
      <span className="flex h-6 w-full items-center gap-2">
        {icon && <span className="flex-none text-ink-3">{icon}</span>}
        <span className="min-w-0 flex-1 text-[15px] font-medium leading-6 text-ink">
          {children}
        </span>
        {trailing && <span className="flex-none text-ink-3">{trailing}</span>}
      </span>
    </>
  );
}
