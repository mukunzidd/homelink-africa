"use client";

import { useTranslations } from "next-intl";
import { useSmartSearch, InlineSmartSearch, askInline } from "./smart-search";
import { EXAMPLE_KEYS } from "@/lib/search/examples";

/**
 * The landing page's one question, asked in place.
 *
 * It used to be a field-shaped button that opened the palette over the page.
 * The hero has the room for the answer, so the sentence is now typed here and
 * read back under the field, with the same model as the palette: one place
 * parses sentences, one place shows what they were read as. The empty field
 * cycles through real examples, because the most useful thing a blank field
 * can do is show what it accepts.
 */
export function HeroSearch() {
  const t = useTranslations("smart");
  return <InlineSmartSearch cycle={EXAMPLE_KEYS.map((k) => t(k))} />;
}

/**
 * A button that asks a given sentence: in the page's inline field when there
 * is one, so the example and its answer sit under the same headline as
 * everything else, otherwise in the palette.
 */
export function AskButton({ query, children, className }: { query: string; children: React.ReactNode; className?: string }) {
  const { open } = useSmartSearch();
  return (
    <button type="button" onClick={() => askInline(query) || open(query)} className={className}>
      {children}
    </button>
  );
}
