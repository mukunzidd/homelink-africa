"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addDays, type IsoDate } from "@/lib/domain/dates";
import { staySearchToQuery, type StaySearch } from "@/lib/search-params";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { PinIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

/**
 * Carries the search across the product.
 *
 * Without this, results were a list with no criteria behind it: prices could
 * only say "per night" because there were no dates to total, and "2 left for
 * these dates" pointed at dates nobody had chosen. The bar is the same control
 * on the landing page and above results, and it writes to the URL both times,
 * so a result set is one link.
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

  const [neighbourhood, setNeighbourhood] = useState(search.neighbourhood ?? "");
  const [from, setFrom] = useState<IsoDate | null>(search.from);
  const [to, setTo] = useState<IsoDate | null>(search.to);
  const [party, setParty] = useState(search.party);

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

  const fieldShell = cn(
    "flex min-h-11 flex-col justify-center gap-0.5 rounded-ctl border border-line bg-surface px-3 py-2",
    "transition-colors duration-150 focus-within:border-brand hover:bg-surface-2",
  );
  const fieldLabel =
    "text-[11px] font-bold uppercase tracking-wider text-ink-3";
  const bareInput =
    "bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-3";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-card border border-line bg-surface p-3 sm:flex-row sm:items-stretch",
        variant === "hero" && "shadow-[var(--shadow-card)]",
      )}
    >
      <label className={cn(fieldShell, "sm:flex-[1.2]")}>
        <span className={fieldLabel}>{t("where")}</span>
        <span className="flex items-center gap-1.5">
          <PinIcon size={14} className="flex-none text-ink-3" />
          <input
          list="neighbourhood-options"
          value={neighbourhood}
          onChange={(e) => setNeighbourhood(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={tResults("anyNeighbourhood")}
          className={cn(bareInput, "w-full")}
          />
        </span>
        <datalist id="neighbourhood-options">
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
        value={party}
        onChange={(next) => setParty(Number(next))}
        icon={<UsersIcon size={14} />}
        variant="field"
        options={Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => ({
          value: n,
          label: t("guestCount", { count: n }),
        }))}
        className="sm:w-44"
      />

      <Button onClick={submit} size="lg" className="sm:w-auto sm:self-stretch">
        <SearchIcon />
        <span className="sm:sr-only lg:not-sr-only">{t("submit")}</span>
      </Button>
    </div>
  );
}
