"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The price and the next step, pinned to the bottom of a phone.
 *
 * On a 390px screen the booking panel sits after the house rules, about five
 * thousand pixels down, so a guest who had decided had to scroll past
 * everything to act on it. The bar scrolls to the panel rather than opening a
 * second copy of it, and it steps aside while the panel itself is on screen.
 */
export function MobileActionBar({ target, children, cta }: { target: string; children: ReactNode; cta: string }) {
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <>
      {/* Room at the bottom of the page so the bar never covers the footer. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200 lg:hidden ${
          panelVisible ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">{children}</div>
          <button
            type="button"
            onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="min-h-11 flex-none cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
          >
            {cta}
          </button>
        </div>
      </div>
    </>
  );
}
