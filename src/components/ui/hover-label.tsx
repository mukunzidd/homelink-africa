/**
 * The name of an icon-only control, shown under it on hover or keyboard
 * focus. The control keeps its own aria-label; this is for eyes only, so a
 * suitcase never has to be guessed at. Its parent needs `group relative`.
 */
export function HoverLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-inner bg-ink px-2 py-1 text-[12px] font-medium text-surface opacity-0 transition-opacity delay-0 duration-100 group-hover:opacity-100 group-hover:delay-300 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}
