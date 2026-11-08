"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GridIcon,
} from "@/components/ui/icons";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/cn";

/**
 * Gallery for a supply item.
 *
 * The verification promise says HomeLink shoots every listing itself, so a
 * frame we have not shot yet is a deterministic panel derived from the item's
 * seed rather than a borrowed photograph, and the lightbox says plainly what
 * those stand in for. Frames fill from `images` in order, so a partly
 * photographed item shows what exists and panels the rest.
 */

/**
 * One mosaic per photo count, applied from `sm`. Below it only the lead
 * frame shows, at any count.
 *
 * 1: the lead alone. 2: halves. 3: the lead and two stacked beside it.
 * 4: the lead, one wide frame and two small under it. 5: the lead and four.
 * Cars are about to arrive with one or two photographs, so those counts are
 * layouts in their own right rather than a five-frame grid with holes.
 */
const MOSAICS = {
  1: { grid: "", lead: "", tiles: [] as string[] },
  2: { grid: "sm:grid-cols-2", lead: "", tiles: ["sm:block"] },
  3: { grid: "sm:grid-cols-4 sm:grid-rows-2", lead: "sm:col-span-2 sm:row-span-2", tiles: ["sm:col-span-2 sm:block", "sm:col-span-2 sm:block"] },
  4: { grid: "sm:grid-cols-4 sm:grid-rows-2", lead: "sm:col-span-2 sm:row-span-2", tiles: ["sm:col-span-2 sm:block", "sm:block", "sm:block"] },
  5: { grid: "sm:grid-cols-4 sm:grid-rows-2", lead: "sm:col-span-2 sm:row-span-2", tiles: ["sm:block", "sm:block", "sm:block", "sm:block"] },
};

/** How wide a frame renders, for `sizes`: half the mosaic or a quarter. */
function tileSizes(n: number, i: number): string {
  return n <= 3 || (n === 4 && i === 0) ? "(max-width: 640px) 100vw, 50vw" : "25vw";
}

/** Distinct seeds so the frames differ from each other but stay stable. */
function framesFor(seed: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${seed}-${i}`);
}

export function Gallery({
  seed,
  images,
  alt = "",
  count = 5,
  verifiedLabel,
  className,
}: {
  seed: string;
  /** Real photographs. Falls back to seeded panels where absent. */
  images?: string[];
  alt?: string;
  count?: number;
  verifiedLabel?: string;
  className?: string;
}) {
  const t = useTranslations("gallery");
  // A photographed item shows exactly its photographs, and the mosaic takes
  // a shape that fits how many there are. Padding three photographs out to
  // five with seeded panels put two empty green tiles beside real rooms,
  // which read as something failing to load. Only an item with no
  // photographs at all gets the seeded panels, and the lightbox says why.
  const frames = framesFor(seed, images?.length ? images.length : count);
  const n = frames.length;
  const layout = MOSAICS[Math.min(n, 5) as 1 | 2 | 3 | 4 | 5];
  const srcAt = (i: number) => images?.[i];

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useDismissable(dialogRef, open, () => setOpen(false));

  // Return focus to the control that opened the lightbox, so keyboard users
  // are not dumped back at the top of the document. Guarded on "was open", or
  // this fires on mount and steals focus to the gallery on every page load.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) dialogRef.current?.focus();
    else if (wasOpen.current) openerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
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

  /** Tiles darken slightly on hover so the mosaic answers the cursor. */
  const FRAME = cn(
    "group relative cursor-pointer overflow-hidden bg-surface-2",
    "after:absolute after:inset-0 after:bg-ink after:opacity-0",
    "after:transition-opacity after:duration-200 hover:after:opacity-[0.12]",
  );

  function show(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return (
    <>
      {/*
        One lead frame and up to four supporting, collapsing to the lead alone
        below `sm` rather than shrinking five frames into unreadable slivers.

        Rounding lives on the container, never the tiles: rounding each tile
        would put a curve in the middle of the mosaic where two of them meet.
        A hairline gap plus a shared clip is what makes this read as one image
        split into panes instead of five separate cards.
      */}
      <div
        className={cn(
          "relative grid h-[22rem] grid-cols-1 grid-rows-1 gap-1.5 overflow-hidden rounded-card sm:h-[26rem]",
          layout.grid,
          className,
        )}
      >
        <button
          ref={n === 1 ? openerRef : undefined}
          type="button"
          onClick={() => show(0)}
          aria-label={t("counter", { current: 1, total: frames.length })}
          className={cn(FRAME, layout.lead)}
        >
          <SupplyImage
            seed={frames[0]}
            src={srcAt(0)}
            alt={alt}
            priority
            sizes={n === 1 ? "100vw" : "(max-width: 640px) 100vw, 50vw"}
            className="h-full w-full"
          >
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
            className={cn(FRAME, "hidden", layout.tiles[i])}
          >
            <SupplyImage
              seed={frame}
              src={srcAt(i + 1)}
              alt={alt}
              sizes={tileSizes(n, i)}
              className="h-full w-full"
            />
          </button>
        ))}

        {/* With a single photograph there is nothing more to see, so the
            button would promise a gallery that is the same picture again.
            The photograph itself still opens it full size. */}
        {n > 1 && (
          <button
            ref={openerRef}
            type="button"
            onClick={() => show(0)}
            className={cn(
              "absolute bottom-4 right-4 z-10 flex cursor-pointer items-center gap-2 rounded-full",
              "border border-ink/15 bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink",
              "shadow-[var(--shadow-card)] transition-transform duration-150",
              "hover:scale-[1.03] active:scale-[0.98]",
            )}
          >
            <GridIcon size={14} />
            {t("openGallery")}
          </button>
        )}
      </div>

      {open && (
        /* The lightbox commits to a single dark world in both themes, the way
           a cinema does — a light scrim behind a photograph fights it. So the
           scrim and its chrome use fixed values rather than tokens: `--ink`
           here would be near-white in dark mode and invert the overlay. */
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050B08]/92 p-4 backdrop-blur-sm"
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
            className="flex w-full max-w-5xl flex-col gap-4 outline-none"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="tnum rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white/90">
                {t("counter", { current: index + 1, total: frames.length })}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative">
              <SupplyImage
                seed={frames[index]}
                src={srcAt(index)}
                alt={alt}
                sizes="(max-width: 1024px) 100vw, 960px"
                className="aspect-[3/2] w-full rounded-card"
              />

              {n > 1 && [
                { dir: -1, label: t("previous"), side: "left-4", icon: <ChevronLeftIcon size={20} /> },
                { dir: 1, label: t("next"), side: "right-4", icon: <ChevronRightIcon size={20} /> },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  onClick={() => step(control.dir)}
                  aria-label={control.label}
                  className={cn(
                    "absolute top-1/2 grid size-12 -translate-y-1/2 cursor-pointer place-items-center",
                    "rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25",
                    control.side,
                  )}
                >
                  {control.icon}
                </button>
              ))}
            </div>

            {n > 1 && (
              <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                {frames.map((frame, i) => (
                  <button
                    key={frame}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={t("counter", { current: i + 1, total: frames.length })}
                    aria-current={i === index}
                    className={cn(
                      "h-14 w-20 flex-none cursor-pointer overflow-hidden rounded-ctl transition-opacity",
                      i === index ? "ring-2 ring-white" : "opacity-45 hover:opacity-80",
                    )}
                  >
                    <SupplyImage
                      seed={frame}
                      src={srcAt(i)}
                      alt={alt}
                      sizes="80px"
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            )}

            {!images?.length && (
              <p className="mx-auto max-w-[64ch] text-center text-xs leading-relaxed text-white/55">
                {t("placeholderNote")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
