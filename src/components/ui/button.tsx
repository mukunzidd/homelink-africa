import { cn } from "@/lib/cn";

/**
 * Style guide: filled = an action you can take.
 *
 * `primary` is the commerce action and there is at most one per view.
 * `trust` is the deepest green and belongs to promises being kept — confirming
 * check-in, releasing escrow. `secondary` carries add-ons, because the bundle
 * is gravity and not a gate (Product & UX Principle 3).
 */
export type ButtonVariant = "primary" | "trust" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-on-brand border-brand hover:bg-brand-deep hover:border-brand-deep",
  trust:
    "bg-trust text-on-trust border-trust hover:bg-brand-deep hover:border-brand-deep",
  secondary:
    "bg-transparent text-brand border-brand hover:bg-brand-tint",
  quiet:
    "bg-transparent text-ink-2 border-line hover:bg-surface-2 hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  // 44px minimum touch target on transaction surfaces, where mistakes cost money.
  sm: "text-sm px-3.5 py-2 min-h-9",
  md: "text-[15px] px-5 py-2.5 min-h-11",
  lg: "text-base px-6 py-3 min-h-12",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-ctl border font-semibold",
        "transition-colors duration-150 ease-out cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
