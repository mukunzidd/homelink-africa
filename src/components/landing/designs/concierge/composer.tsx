"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The thread's reply box. It is sticky to the bottom of the screen while the
 * thread is on screen, the way a chat app keeps its input in reach, so on a
 * phone the search is in the first screen without a second copy of it (two
 * inline searches would fight over the one answer panel).
 *
 * Pinned at the bottom, an answer opening downwards would land off screen,
 * so while the field sits low the answer opens upwards over the thread, like
 * a reply. It flips back when the box has room below it.
 */
export function Composer({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const form = el.querySelector("form") ?? el;
        const r = form.getBoundingClientRect();
        const below = window.innerHeight - r.bottom;
        setUp(below < 360 && r.top > below);
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-up={up || undefined}
      className={cn(
        "[&[data-up]_form+div]:bottom-full [&[data-up]_form+div]:top-auto [&[data-up]_form+div]:mb-2 [&[data-up]_form+div]:mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
