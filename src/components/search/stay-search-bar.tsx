"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addDays, type IsoDate } from "@/lib/domain/dates";
import { staySearchToQuery, type StaySearch } from "@/lib/search-params";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select } from "@/components/ui/select";
import {
  FIELD_SHELL,
  FieldContent,
  fieldShellState,
} from "@/components/ui/field-shell";
import { PinIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Carries the search across the product.
 *
 * Without this, results were a list with no criteria behind it: prices could
 * only say "per night" because there were no dates to total, and "2 left for
 * these dates" pointed at dates nobody had chosen. The bar is the same control
 * on the landing page and above results, and it writes to the URL both times,
 * so a result set is one link.
 *
 * Every field renders through the shared shell in `ui/field-shell`, which is
 * what keeps a text input, two date triggers, and a listbox on one baseline.
 */
export function StaySearchBar({
  search,
  neighbourhoods,
  maxParty = 8,
  variant = "results",
}: {
  search: StaySearch;
  neighbourhoods: string[];
  maxParty?: number;
  variant?: "results" | "hero";
}) {
  const t = useTranslations("search");
  const tResults = useTranslations("results");
  const router = useRouter();
  const listId = useId();

  const [neighbourhood, setNeighbourhood] = useState(search.neighbourhood ?? "");
  const [from, setFrom] = useState<IsoDate | null>(search.from);
  const [to, setTo] = useState<IsoDate | null>(search.to);
  const [party, setParty] = useState(search.party);
  const [whereFocused, setWhereFocused] = useState(false);

  function submit() {
    const query = staySearchToQuery({
      ...search,
      neighbourhood: neighbourhood || undefined,
      from,
      to,
      party,
    });
    router.push(query ? `/stays?${query}` : "/stays");
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-card border border-line bg-surface p-2",
        "sm:flex-row sm:items-stretch",
        variant === "hero" && "shadow-[var(--shadow-card)]",
      )}
    >
      <label
        className={cn(
          FIELD_SHELL,
          fieldShellState(whereFocused, false),
          "cursor-text sm:flex-[1.3]",
        )}
      >
        <FieldContent label={t("where")} icon={<PinIcon size={15} />}>
          <input
            list={listId}
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
            onFocus={() => setWhereFocused(true)}
            onBlur={() => setWhereFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={tResults("anyNeighbourhood")}
            /* h-6 and leading-6 match the shell's value row exactly. An input
               left to its own line box is what threw this field off. */
            className="h-6 w-full bg-transparent p-0 text-[15px] font-medium leading-6 text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </FieldContent>
        <datalist id={listId}>
          {neighbourhoods.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>

      <DateRangePicker
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          setTo(nextTo ?? (nextFrom ? addDays(nextFrom, 3) : null));
        }}
        labelFrom={t("arriving")}
        labelTo={t("leaving")}
        className="sm:flex-[2]"
      />

      <Select
        label={t("guests")}
        variant="field"
        value={party}
        onChange={(next) => setParty(Number(next))}
        icon={<UsersIcon size={15} />}
        options={Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => ({
          value: n,
          label: t("guestCount", { count: n }),
        }))}
        className="sm:w-[9.5rem]"
      />

      {/* Matches the field height exactly rather than stretching to the bar,
          so the row reads as five aligned objects instead of four boxes and a
          slab. The icon sits in a translucent chip: at this weight a bare
          glyph on a solid fill looks stamped on rather than designed in. */}
      <button
        type="button"
        onClick={submit}
        className={cn(
          "flex min-h-[60px] cursor-pointer items-center justify-center gap-2.5 rounded-ctl",
          "bg-brand px-5 text-[15px] font-semibold text-on-brand",
          "transition-colors duration-150 hover:bg-brand-deep sm:px-6",
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-7 flex-none place-items-center rounded-full bg-white/15"
        >
          <SearchIcon size={15} />
        </span>
        {t("submit")}
      </button>
    </div>
  );
}
