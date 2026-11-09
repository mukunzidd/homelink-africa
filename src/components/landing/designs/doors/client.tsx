"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import type { Segment } from "@/lib/domain/types";
import { convert, formatMoney, type Money } from "@/lib/domain/money";
import { NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { usePreferences } from "@/lib/preferences/context";
import { HeroSearch } from "@/components/search/hero-search";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { pick } from "../copy";
import { copy } from "../doors.copy";

export type SectionKey = "lanes" | "featured" | "how" | "places" | "days";

/**
 * The order the page takes for each visitor. Someone abroad meets the homes
 * and the promises first, and the lanes last, because a stay is what they came
 * for. Someone in Rwanda meets the lanes first, renting and buying among them,
 * then the neighbourhoods, which they already know by name.
 */
const ORDER: Record<Segment, SectionKey[]> = {
  abroad: ["featured", "how", "places", "days", "lanes"],
  rwanda: ["lanes", "places", "featured", "how", "days"],
};

const SEGMENTS: Segment[] = ["abroad", "rwanda"];

const DOOR_IMAGES: Record<Segment, string> = {
  // The city from a hillside in daylight: what someone flying in is coming to.
  abroad: "/images/experiences/kigali-4.jpg",
  // A family house behind its garden: what someone here is looking for.
  rwanda: "/images/homes/gikondo-family-house-1.jpg",
};

/**
 * Everything on the page that depends on who is looking. The server renders
 * both panels and every section once; this only chooses which panel shows
 * and in which order the sections run. It reads the segment from the
 * preferences, which start from the language on the server and on the first
 * client render alike, so the two agree and nothing moves on hydration.
 */
export function Stage({
  heads,
  facts,
  panels,
  sections,
  lanes,
}: {
  heads: Record<Segment, { title: string; body: string }>;
  facts: React.ReactNode;
  panels: Record<Segment, React.ReactNode>;
  sections: Record<Exclude<SectionKey, "lanes">, React.ReactNode>;
  lanes: Record<Segment, React.ReactNode>;
}) {
  const locale = useLocale();
  const c = pick(copy, locale);
  const { segment, setSegment } = usePreferences();
  const other: Segment = segment === "abroad" ? "rwanda" : "abroad";

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      setSegment(other);
      const next = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-door="${other}"]`);
      next?.focus();
    }
  }

  const all: Record<SectionKey, React.ReactNode> = { ...sections, lanes: lanes[segment] };

  return (
    <div className="flex flex-col">
      {/* First screen. z-10 so the search's answer paints over what follows. */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-12 pt-8 sm:px-6 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12 lg:py-12">
          <div className="flex flex-col items-start gap-6">
            <h1 className="max-w-[16ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[52px]">{heads[segment].title}</h1>
            <p className="max-w-[42ch] text-[17px] leading-relaxed text-ink-2">{heads[segment].body}</p>
            <div className="w-full max-w-[520px]">
              <HeroSearch />
            </div>
            {facts}
          </div>

          <div className="flex min-w-0 flex-col">
            <div role="radiogroup" aria-label={c.choiceLabel} className="grid grid-cols-2">
              {SEGMENTS.map((s) => {
                const on = s === segment;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    data-door={s}
                    onClick={() => setSegment(s)}
                    onKeyDown={onKey}
                    className={cn(
                      "relative flex min-w-0 cursor-pointer items-center gap-3 rounded-t-[16px] border px-3 py-3 text-left transition-colors duration-150 sm:px-4",
                      on ? "z-10 -mb-px border-line border-b-surface bg-surface" : "border-transparent border-b-line hover:bg-surface-2",
                    )}
                  >
                    <span className={cn("relative size-10 flex-none overflow-hidden rounded-[8px] sm:size-12", !on && "opacity-80")}>
                      <Image src={DOOR_IMAGES[s]} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-[15px] font-medium leading-snug", on ? "text-ink" : "text-ink-2")}>{c[s].title}</span>
                      <span className="hidden text-[13px] leading-snug text-ink-3 sm:block">{c[s].sub}</span>
                    </span>
                    <Dot on={on} />
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                "flex flex-col rounded-b-[16px] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6 lg:min-h-[452px]",
                segment === "abroad" ? "rounded-tr-[16px]" : "rounded-tl-[16px]",
              )}
            >
              {panels[segment]}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-24 px-4 pb-16 pt-12 sm:px-6 lg:pt-16">
        {ORDER[segment].map((k) => (
          <div key={k}>{all[k]}</div>
        ))}

        {/* The other door, at the foot of the page, for whoever scrolled this far without choosing. */}
        <div className="flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{segment === "abroad" ? c.otherAbroad : c.otherRwanda}</p>
          <button
            type="button"
            onClick={() => {
              setSegment(other);
              window.scrollTo({ top: 0 });
            }}
            className="inline-flex h-11 flex-none cursor-pointer items-center gap-3 rounded-ctl border border-line bg-surface pl-2 pr-4 text-[15px] font-medium text-ink transition-colors duration-150 hover:border-brand/40"
          >
            <span className="relative size-7 overflow-hidden rounded-[6px]">
              <Image src={DOOR_IMAGES[other]} alt="" fill sizes="28px" className="object-cover" />
            </span>
            {c[other].title}
            <ArrowRightIcon size={16} className="text-ink-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-4 flex-none place-items-center rounded-full border-[1.5px] sm:grid", on ? "border-brand" : "border-ink-3")}>
      {on && <span className="size-2 rounded-full bg-brand" />}
    </span>
  );
}

/**
 * The page's signature: every price carries the other door's currency in
 * small print beside it. Someone abroad sees dollars with the francs the
 * owner set; someone here sees francs with what a visiting cousin will see.
 * The exact one carries no mark; a converted one is marked as approximate.
 */
export function TwoPrice({ amount, unit, prefix, className }: { amount: Money; unit?: string; prefix?: string; className?: string }) {
  const locale = useLocale();
  const { currency, fx, displayRounded } = usePreferences();
  const second = currency === "RWF" ? "USD" : "RWF";
  const exact = amount.currency === second;
  const other = formatMoney(convert(amount, second, fx), NUMBER_LOCALES[locale as Locale] ?? locale, { showDecimals: false });
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="tnum font-medium text-ink">
        {prefix && <span className="font-normal text-ink-3">{prefix} </span>}
        {displayRounded(amount)}
        {unit && <span className="font-normal text-ink-3">{unit}</span>}
      </span>
      <span className="tnum text-[12px] text-ink-3">{exact ? other : `≈ ${other}`}</span>
    </span>
  );
}

/** The display currency, named, with the other one the signature puts beside it. */
export function CurrencyFact() {
  const locale = useLocale();
  const c = pick(copy, locale);
  const { currency } = usePreferences();
  const second = currency === "RWF" ? "USD" : "RWF";
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[15px] font-medium text-ink">{c.currencyTitle(currency)}</span>
      <span className="text-[13px] leading-snug text-ink-3">{c.currencyBody(second)}</span>
    </span>
  );
}
