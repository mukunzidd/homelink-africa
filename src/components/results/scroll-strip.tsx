"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * A horizontal strip that says it scrolls.
 *
 * The neighbourhood band used to bleed 24px past the content edge on both
 * sides with its scrollbar hidden, so the last card was simply cut off and
 * nothing suggested there was more. It now stops at the container, fades the
 * edge that has more behind it, and from `sm` offers arrows on that side.
 * The fades and arrows follow the scroll position, so neither shows when
 * there is nothing left to reveal.
 */
export function ScrollStrip({
  children,
  label,
  backLabel,
  moreLabel,
}: {
  children: ReactNode;
  label: string;
  backLabel: string;
  moreLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft > 4,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  function page(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  // One mask for both edges, so the fades never stack into a darker band.
  const mask = `linear-gradient(to right, ${edges.start ? "transparent, #000 48px" : "#000, #000"}, ${edges.end ? "#000 calc(100% - 48px), transparent" : "#000, #000"})`;

  const arrow = "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[var(--float-line)] bg-[var(--float-bg)] text-[var(--float-ink)] shadow-[var(--shadow-pop)] transition-transform duration-150 hover:scale-[1.05]";

  return (
    <section aria-label={label} className="relative">
      <div
        ref={ref}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children}
      </div>
      {edges.start && (
        <button type="button" aria-label={backLabel} onClick={() => page(-1)} className={cn(arrow, "-left-3 sm:grid")}>
          <ChevronLeftIcon />
        </button>
      )}
      {edges.end && (
        <button type="button" aria-label={moreLabel} onClick={() => page(1)} className={cn(arrow, "-right-3 sm:grid")}>
          <ChevronRightIcon />
        </button>
      )}
    </section>
  );
}
