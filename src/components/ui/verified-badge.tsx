import { cn } from "@/lib/cn";

/**
 * Ringed, never filled.
 *
 * That is the one form no button takes, so a promise can never be mistaken for
 * a control — which matters most in greyscale and for colourblind users. The
 * badge is always a link to the verification record; it is never decoration.
 */
export function VerifiedBadge({
  label,
  size = "md",
  className,
}: {
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide",
        "text-trust bg-trust-tint border-[1.5px] border-trust/55",
        size === "sm" ? "text-[11px] pl-1.5 pr-2.5 py-0.5" : "text-xs pl-2 pr-2.5 py-1",
        className,
      )}
    >
      <svg
        width={size === "sm" ? 11 : 13}
        height={size === "sm" ? 11 : 13}
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="flex-none"
      >
        <path
          d="M4.8 8.1l2.1 2.1 4.3-4.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
