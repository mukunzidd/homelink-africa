"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { ChoiceList, PillSearch } from "@/components/search/pill-search";
import { cn } from "@/lib/cn";

/**
 * Buy's search: where, what kind of building, and the budget.
 *
 * Stay and Rent had a search bar and Buy had none, so the third mode of the
 * same lane started one step lower. Same pill, Buy's questions. The budget
 * understands "200M", which is how a house price is said in Kigali, and
 * offers four round figures so most people never type one.
 */
export function BuySearchBar({
  neighbourhoods,
  initial,
}: {
  neighbourhoods: string[];
  initial: { neighbourhood?: string; kind?: string; max?: string };
}) {
  const t = useTranslations("sale");
  const tList = useTranslations("list");
  const tResults = useTranslations("results");
  const tPanel = useTranslations("searchPanel");
  const router = useRouter();
  const { currency } = usePreferences();
  const [where, setWhere] = useState(initial.neighbourhood ?? "");
  const [kind, setKind] = useState(initial.kind ?? "");
  const [max, setMax] = useState(compactBudget(initial.max));

  function submit() {
    const p = new URLSearchParams();
    if (where) p.set("neighbourhood", where);
    if (kind) p.set("kind", kind);
    const n = parseBudget(max);
    if (n) {
      p.set("max", String(n));
      p.set("cur", currency);
    }
    router.push(p.size ? `/buy?${p}` : "/buy");
  }

  const presets = currency === "RWF" ? ["100M", "150M", "200M", "300M"] : ["75k", "100k", "150k", "250k"];
  const budget = max.trim() ? `${currency} ${max.trim()}` : null;
  const summary = [where, kind ? t(`kind.${kind}`) : "", budget ?? ""].filter(Boolean).join(" · ") || tResults("anyNeighbourhood");

  return (
    <PillSearch
      mobileTitle={tList("buySearchTitle")}
      mobileSummary={summary}
      onSubmit={submit}
      segments={[
        { key: "where", label: tPanel("whereLabel"), value: where || tResults("anyNeighbourhood"), filled: !!where, flex: "sm:flex-[1.4]" },
        { key: "kind", label: t("kindLabel"), value: kind ? t(`kind.${kind}`) : t("kindAny"), filled: !!kind, flex: "sm:flex-1" },
        { key: "budget", label: tList("budgetLabel"), value: budget ?? tList("budgetAny"), filled: !!budget, flex: "sm:flex-[1.2]" },
      ]}
      panels={[
        {
          key: "where",
          align: "left",
          clear: { label: tPanel("clear"), onClear: () => setWhere(""), disabled: !where },
          body: (
            <ChoiceList
              className="max-h-[22rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto"
              value={where}
              onChange={setWhere}
              options={[{ value: "", label: tResults("anyNeighbourhood") }, ...neighbourhoods.map((n) => ({ value: n, label: n }))]}
            />
          ),
        },
        {
          key: "kind",
          align: "center",
          clear: { label: tPanel("clear"), onClear: () => setKind(""), disabled: !kind },
          body: (
            <ChoiceList
              className="w-[min(18rem,calc(100vw-2rem))]"
              value={kind}
              onChange={setKind}
              options={[{ value: "", label: t("kindAny") }, ...(["house", "apartment", "townhouse"] as const).map((k) => ({ value: k, label: t(`kind.${k}`) }))]}
            />
          ),
        },
        {
          key: "budget",
          align: "right",
          clear: { label: tPanel("clear"), onClear: () => setMax(""), disabled: !max },
          body: (
            <div className="flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 p-5">
              <label className="flex h-11 items-center gap-2 rounded-ctl border border-line bg-surface px-3 focus-within:border-ink-3">
                <span className="text-[13px] font-semibold text-ink-3">{currency}</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder={tList("budgetPlaceholder", { example: presets[2] })}
                  aria-label={tList("budgetLabel")}
                  className="tnum min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
                />
              </label>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={max === v}
                    onClick={() => setMax(v)}
                    className={cn(
                      "tnum h-9 cursor-pointer rounded-ctl border text-[13px] font-medium transition-colors duration-150",
                      max === v ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

/** "200M", "150k" or "200000000" to a number, or null. */
function parseBudget(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const n = Number(s.replace(/[^\d.]/g, "")) * (/m|million/.test(s) ? 1_000_000 : /k/.test(s) ? 1_000 : 1);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 135000000 back to "135M", so the bar shows the figure the way it was typed. */
function compactBudget(raw?: string): string {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return raw ?? "";
  if (n >= 1_000_000 && n % 100_000 === 0) return `${n / 1_000_000}M`;
  if (n >= 1_000 && n % 1_000 === 0) return `${n / 1_000}k`;
  return raw;
}
