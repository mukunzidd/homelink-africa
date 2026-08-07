import { cn } from "@/lib/cn";

/**
 * Style guide rule: the house mark keeps its gold on any ground — it is a
 * shape, not text, so the 4.5:1 contrast floor does not apply. The wordmark
 * switches to `ink`, because gold type on white measures 2.4:1 and fails.
 *
 * This is the only gold in the interface. It belongs to the logo, not to the
 * palette, and nothing else may borrow it.
 */
const MARK_GOLD = "#C69434";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="34"
        height="27"
        viewBox="0 0 58 46"
        aria-hidden="true"
        className="flex-none"
      >
        <path
          d="M4 24 L29 5 L54 24"
          fill="none"
          stroke={MARK_GOLD}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M46 20 V40"
          fill="none"
          stroke={MARK_GOLD}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M2 33 Q22 24 38 34"
          fill="none"
          stroke={MARK_GOLD}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <rect x="25" y="14" width="4.6" height="4.6" fill={MARK_GOLD} />
        <rect x="32" y="14" width="4.6" height="4.6" fill={MARK_GOLD} />
        <rect x="25" y="21" width="4.6" height="4.6" fill={MARK_GOLD} />
        <rect x="32" y="21" width="4.6" height="4.6" fill={MARK_GOLD} />
      </svg>
      {showWordmark && (
        <span className="text-[15px] font-bold leading-none tracking-tight text-ink">
          HomeLink
          <span className="text-ink-3 font-semibold"> Africa</span>
        </span>
      )}
    </span>
  );
}
