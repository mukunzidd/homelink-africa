"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExpandIcon,
} from "@/components/ui/icons";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/cn";

/**
 * Gallery for a supply item.
 *
 * The verification promise says HomeLink shoots every listing itself, so stock
 * photography would contradict the product on the very screen that argues for
 * it. Until the shooting standard exists, each frame is a deterministic panel
 * derived from the item's seed, and the lightbox says plainly what they stand
 * in for. The layout, counter, keyboard handling, and lightbox are all real —
 * dropping in real images later changes one component.
 */

/** Distinct seeds so the frames differ from each other but stay stable. */
function framesFor(seed: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${seed}-${i}`);
}

export function Gallery({
  seed,
  count = 5,
  verifiedLabel,
  className,
}: {
  seed: string;
  count?: number;
  verifiedLabel?: string;
  className?: string;
}) {
  const t = useTranslations("gallery");
  const frames = framesFor(seed, count);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useDismissable(dialogRef, open, () => setOpen(false));

  // Return focus to the control that opened the lightbox, so keyboard users
  // are not dumped back at the top of the document.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
    else openerRef.current?.focus({ preventScroll: true });
  }, [open]);

  // The lightbox covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function step(delta: number) {
    setIndex((i) => (i + delta + frames.length) % frames.length);
  }

  function show(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return (
    <>
      {/* Airbnb's mosaic: one lead frame, four supporting. Below `sm` it
          collapses to the lead alone rather than shrinking five frames into
          unreadable slivers. */}
      <div
        className={cn(
          "relative grid h-64 gap-2 overflow-hidden rounded-card sm:h-80 sm:grid-cols-4 sm:grid-rows-2",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => show(0)}
          aria-label={t("counter", { current: 1, total: frames.length })}
          className="group relative col-span-2 row-span-2 cursor-pointer overflow-hidden rounded-card sm:rounded-none"
        >
          <SupplyImage seed={frames[0]} className="h-full w-full">
            {verifiedLabel && (
              <span className="absolute left-4 top-4">
                <VerifiedBadge label={verifiedLabel} />
              </span>
            )}
          </SupplyImage>
        </button>

        {frames.slice(1, 5).map((frame, i) => (
          <button
            key={frame}
            type="button"
            onClick={() => show(i + 1)}
            aria-label={t("counter", { current: i + 2, total: frames.length })}
            className="relative hidden cursor-pointer overflow-hidden sm:block"
          >
            <SupplyImage seed={frame} className="h-full w-full" />
          </button>
        ))}

        <button
          ref={openerRef}
          type="button"
          onClick={() => show(0)}
          className={cn(
            "absolute bottom-3 right-3 flex cursor-pointer items-center gap-2 rounded-ctl",
            "border border-line bg-surface/95 px-3 py-2 text-[13px] font-semibold text-ink",
            "shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:bg-surface",
          )}
        >
          <ExpandIcon size={14} />
          {t("openGallery")}
        </button>
      </div>

      {open && (
        /* The lightbox commits to a single dark world in both themes, the way
           a cinema does — a light scrim behind a photograph fights it. So the
           scrim and its chrome use fixed values rather than tokens: `--ink`
           here would be near-white in dark mode and invert the overlay. */
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050B08]/90 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("label")}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") step(-1);
              if (e.key === "ArrowRight") step(1);
            }}
            className="flex w-full max-w-4xl flex-col gap-3 outline-none"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="tnum text-sm font-semibold text-white/90">
                {t("counter", { current: index + 1, total: frames.length })}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/22"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative">
              <SupplyImage
                seed={frames[index]}
                className="aspect-[3/2] w-full rounded-card"
              />

              {[
                { dir: -1, label: t("previous"), side: "left-3", icon: <ChevronLeftIcon size={18} /> },
                { dir: 1, label: t("next"), side: "right-3", icon: <ChevronRightIcon size={18} /> },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  onClick={() => step(control.dir)}
                  aria-label={control.label}
                  className={cn(
                    "absolute top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center",
                    "rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/22",
                    control.side,
                  )}
                >
                  {control.icon}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {frames.map((frame, i) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t("counter", { current: i + 1, total: frames.length })}
                  aria-current={i === index}
                  className={cn(
                    "h-14 w-20 flex-none cursor-pointer overflow-hidden rounded-[6px] transition-opacity",
                    i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-85",
                  )}
                >
                  <SupplyImage seed={frame} className="h-full w-full" />
                </button>
              ))}
            </div>

            <p className="max-w-[68ch] text-xs leading-relaxed text-white/60">
              {t("placeholderNote")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
