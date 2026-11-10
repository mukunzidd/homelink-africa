"use client";

import { useId, useState } from "react";
import type { Money } from "@/lib/domain/money";
import { staySearchToQuery } from "@/lib/search-params";
import { Link } from "@/i18n/navigation";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** One home: its photographs all go on the wall, and light or fade together. */
export type Tile = { key: string; name: string; where: string; price: Money; href: string; images: string[]; seed: string };

type Labels = { slider: string; orLess: string; aNight: string; wall: string; cheapest: string; dearest: string };

/**
 * The slider and the wall. Every photograph of every home is on the wall,
 * so a dozen homes make a wall and not a row. The slider's steps are the homes themselves,
 * cheapest first, so each step lights exactly one more photograph and the
 * price shown is always a real rate on the site rather than a round number
 * nothing costs. It starts two thirds of the way along, so the first screen
 * shows both what fits and what does not.
 */
export function Wall({
  tiles,
  title,
  labels,
  fit,
  see,
}: {
  tiles: Tile[];
  title: string;
  labels: Labels;
  fit: Record<number, string>;
  see: Record<number, string>;
}) {
  const id = useId();
  const [k, setK] = useState(Math.max(1, Math.round(tiles.length * 0.66)));
  if (tiles.length === 0) return null;
  const price = tiles[k - 1].price;
  const query = staySearchToQuery({ maxPrice: price });

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start lg:py-4">
        <h1 className="text-balance font-display text-[34px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[44px]">{title}</h1>

        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <label htmlFor={id} className="text-[13px] text-ink-3">{labels.slider}</label>
          <p aria-live="polite" className="flex flex-wrap items-baseline gap-x-2">
            <MoneyText amount={price} rounded className="font-display text-[40px] font-medium leading-none tracking-tight text-ink" />
            <span className="text-[15px] text-ink-2">{labels.aNight} {labels.orLess}</span>
          </p>
          <input
            id={id}
            type="range"
            min={1}
            max={tiles.length}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            aria-valuetext={fit[k]}
            className="h-6 w-full cursor-pointer accent-[var(--brand)]"
          />
          <div className="flex justify-between text-[12px] text-ink-3">
            <MoneyText amount={tiles[0].price} rounded />
            <MoneyText amount={tiles[tiles.length - 1].price} rounded />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="tnum text-[15px] font-medium text-ink">{fit[k]}</span>
            <Link
              href={`/stays${query ? `?${query}` : ""}`}
              className="inline-flex h-10 items-center gap-2 rounded-ctl bg-brand px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-brand-deep"
            >
              {see[k]}
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[12px] text-ink-3">
          <span>{labels.cheapest}</span>
          <span className="sr-only">{labels.wall}</span>
          <span>{labels.dearest}</span>
        </div>
        <ul aria-label={labels.wall} className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2 lg:grid-cols-7 xl:grid-cols-8">
          {tiles.flatMap((t, i) => {
            const lit = i < k;
            const shots = t.images.length ? t.images : [undefined];
            return shots.map((src, j) => (
              <li key={`${t.key}-${j}`}>
                <Link
                  href={t.href}
                  // One link per home for a keyboard or a screen reader; the
                  // other photographs of the same home are pointer targets only.
                  tabIndex={j === 0 ? undefined : -1}
                  aria-hidden={j === 0 ? undefined : true}
                  className={cn(
                    "group relative block aspect-square overflow-hidden rounded-[8px] transition-[opacity,filter,transform] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none",
                    lit ? "opacity-100" : "scale-[0.94] opacity-20 grayscale",
                  )}
                >
                  <SupplyImage seed={t.seed} src={src} alt="" sizes="(max-width: 640px) 25vw, 160px" className="h-full w-full" />
                  <span className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(180deg,transparent_40%,rgba(6,20,14,0.85))] p-2 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="truncate text-[12px] font-medium leading-tight">{t.name}</span>
                    <span className="flex justify-between gap-1 text-[11px] text-white/80">
                      <span className="truncate">{t.where}</span>
                      <MoneyText amount={t.price} rounded />
                    </span>
                  </span>
                </Link>
              </li>
            ));
          })}
        </ul>
      </div>
    </section>
  );
}
