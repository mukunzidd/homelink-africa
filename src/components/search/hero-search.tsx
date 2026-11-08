"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SparkIcon, ArrowRightIcon } from "@/components/ui/icons";
import { useSmartSearch } from "./smart-search";
import { EXAMPLE_KEYS } from "@/lib/search/examples";

/**
 * The landing page's one question.
 *
 * Field-shaped, and it opens the palette rather than being a second search
 * implementation: one place parses sentences, one place shows what they were
 * read as. The placeholder cycles through real examples, slowly, because the
 * most useful thing a blank field can do is show what it accepts.
 */
export function HeroSearch() {
  const t = useTranslations("smart");
  const { open } = useSmartSearch();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % EXAMPLE_KEYS.length), 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => open()}
        onKeyDown={(e) => {
          // Typing on the focused field starts the sentence in the palette.
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            open(e.key);
          }
        }}
        aria-label={t("open")}
        className="group flex w-full max-w-[720px] cursor-text items-center gap-3 rounded-full bg-surface py-2 pl-5 pr-2 text-left shadow-[0_18px_50px_-18px_rgba(0,0,0,0.55)] ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-px"
      >
        <SparkIcon size={20} className="flex-none text-brand" />
        <span className="relative h-6 min-w-0 flex-1 overflow-hidden text-[16px] text-ink-3 sm:text-[17px]">
          <span key={i} className="absolute inset-0 truncate animate-[rise_400ms_ease-out]">
            {t(EXAMPLE_KEYS[i])}
          </span>
        </span>
        <span className="inline-flex h-11 flex-none items-center gap-2 rounded-full bg-brand px-4 text-[15px] font-semibold text-on-brand transition-colors duration-150 group-hover:bg-brand-deep sm:px-5">
          <span className="hidden sm:inline">{t("heroButton")}</span>
          <ArrowRightIcon />
        </span>
      </button>

      <div className="flex max-w-[760px] flex-wrap justify-center gap-2">
        {EXAMPLE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => open(t(k))}
            className="cursor-pointer rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-[13px] text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/40"
          >
            {t(`${k}Short`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A button that opens the palette on a given sentence. */
export function AskButton({ query, children, className }: { query: string; children: React.ReactNode; className?: string }) {
  const { open } = useSmartSearch();
  return (
    <button type="button" onClick={() => open(query)} className={className}>
      {children}
    </button>
  );
}
