"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange, type IsoDate } from "@/lib/domain/dates";
import { staySearchToQuery, type StaySearch } from "@/lib/search-params";
import { useDismissable } from "@/lib/use-dismissable";
import { SearchIcon, SlidersIcon } from "@/components/ui/icons";
import { WherePanel, type Destination } from "./panels/where-panel";
import { WhenPanel, type WhenValue } from "./panels/when-panel";
import { WhoPanel, partySize, type Party } from "./panels/who-panel";
import { cn } from "@/lib/cn";
import { dateTimeFormat } from "@/lib/domain/date-format";

type Segment = "where" | "when" | "who" | "movein" | "bedrooms";

/**
 * One search control, three segments, one open panel at a time.
 *
 * Replaces four separate bordered boxes. That arrangement kept falling out of
 * alignment because each field was a different element with its own line box,
 * but the deeper problem was that four boxes read as four decisions. A pill
 * with segments reads as one decision with three parts, which is what it is.
 *
 * Rent asks different questions. A tenant has no check-out date and no party
 * size; they have a month they want to move in and a number of bedrooms. The
 * pill used to ask a tenant for nightly dates and guests.
 *
 * "Where" takes a sentence as well as a neighbourhood. Typing "quiet flat
 * near the embassies under $2,000" there goes through the same parser as the
 * smart search window, so there is one search box and it is the clever one.
 *
 * On a phone the three rows took most of the first screen before a single
 * home appeared, so it folds to one line that says what is being searched.
 */
export function SearchPill({
  search,
  destinations,
  variant = "results",
  mode = "stay",
  moveIn,
}: {
  search: StaySearch;
  destinations: Destination[];
  variant?: "results" | "hero";
  mode?: "stay" | "rent";
  /** YYYY-MM, when the Rent search carries one. */
  moveIn?: string;
}) {
  const t = useTranslations("searchPanel");
  const tList = useTranslations("list");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const rent = mode === "rent";

  const [open, setOpen] = useState<Segment | null>(null);
  const [expanded, setExpanded] = useState(variant === "hero");
  const [where, setWhere] = useState(search.neighbourhood ?? search.q ?? "");
  const [when, setWhen] = useState<WhenValue>({
    from: search.from,
    to: search.to,
    span: null,
    months: 12,
  });
  const [party, setParty] = useState<Party>({
    adults: Math.max(1, search.party),
    children: 0,
    infants: 0,
  });
  const [month, setMonth] = useState(moveIn ?? "");
  const [beds, setBeds] = useState(search.bedrooms ? String(search.bedrooms) : "");

  useDismissable(rootRef, open !== null, () => setOpen(null));

  const known = destinations.some((d) => d.name.toLowerCase() === where.trim().toLowerCase());
  const place = known ? destinations.find((d) => d.name.toLowerCase() === where.trim().toLowerCase())!.name : undefined;

  function submit(text?: string) {
    setOpen(null);
    const sentence = (text ?? (!known ? where : "")).trim();
    if (rent) {
      const p = new URLSearchParams({ band: "long" });
      if (place) p.set("neighbourhood", place);
      if (beds) p.set("bedrooms", beds);
      if (month) p.set("movein", month);
      if (sentence) p.set("q", sentence);
      router.push(`/stays?${p}`);
      return;
    }
    const query = staySearchToQuery({
      ...search,
      neighbourhood: place,
      q: sentence || undefined,
      from: when.from,
      to: when.to,
      party: partySize(party),
      // A long flexible span is a lease enquiry, so it carries the band that
      // switches the results page out of nightly pricing.
      band: when.span === "long" ? "long" : undefined,
    });
    router.push(query ? `/stays?${query}` : "/stays");
  }

  const intlLocale = INTL_LOCALES[locale];
  const whenSummary = summariseWhen(when, intlLocale, t);
  const whoSummary = summariseParty(party, t);
  const monthLabel = month ? monthName(month, intlLocale) : null;

  const dim = open !== null;
  const segments = rent
    ? [
        { key: "where" as const, label: t("whereLabel"), value: where || t("whereValue"), filled: !!where, flex: "sm:flex-[1.4] sm:rounded-l-full" },
        { key: "movein" as const, label: tList("moveInLabel"), value: monthLabel ?? tList("moveInValue"), filled: !!monthLabel, flex: "sm:flex-[1.1]" },
        { key: "bedrooms" as const, label: tList("bedroomsLabel"), value: beds ? tList("bedroomsValue", { count: Number(beds) }) : tList("bedroomsAny"), filled: !!beds, flex: "" },
      ]
    : [
        { key: "where" as const, label: t("whereLabel"), value: where || t("whereValue"), filled: !!where, flex: "sm:flex-[1.4] sm:rounded-l-full" },
        // The empty Dates field carries the reason to fill it in. It used to
        // be a separate grey banner under the pill saying the same thing.
        { key: "when" as const, label: t("whenLabel"), value: whenSummary ?? (variant === "results" ? tList("addDatesForTotals") : t("whenValue")), filled: !!whenSummary, flex: "sm:flex-[1.3]" },
        { key: "who" as const, label: t("whoLabel"), value: whoSummary ?? t("whoValue"), filled: !!whoSummary, flex: "" },
      ];
  const [first, second, last] = segments;
  const summary = segments.map((x) => (x.filled ? x.value : null)).filter(Boolean).join(" · ") || t("whereValue");

  return (
    <div ref={rootRef} className="relative">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-full border border-line bg-surface py-2 pl-4 pr-2 text-left shadow-[var(--shadow-card)] sm:hidden"
        >
          <SearchIcon size={17} className="text-ink-2" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-semibold text-ink">{rent ? tList("rentSearchTitle") : tList("staySearchTitle")}</span>
            {/* Node and the browser format date ranges with different spaces
                (thin vs narrow no-break), so the text may legitimately differ. */}
            <span suppressHydrationWarning className="truncate text-[13px] text-ink-3">{summary}</span>
          </span>
          <span className="grid size-9 flex-none place-items-center rounded-full border border-line text-ink-2">
            <SlidersIcon size={15} />
          </span>
        </button>
      )}
      <div
        className={cn(
          "flex-col rounded-card border border-line sm:flex sm:flex-row sm:items-stretch sm:rounded-full",
          expanded ? "flex" : "hidden",
          "transition-colors duration-200",
          dim ? "bg-surface-2" : "bg-surface",
          variant === "hero" ? "shadow-[var(--shadow-pop)]" : "shadow-[var(--shadow-card)]",
        )}
      >
        <SegmentButton
          label={first.label}
          value={first.value}
          filled={first.filled}
          active={open === first.key}
          dim={dim}
          onClick={() => setOpen(open === first.key ? null : first.key)}
          className={first.flex}
        />

        <Divider hidden={dim} />

        <SegmentButton
          label={second.label}
          value={second.value}
          filled={second.filled}
          active={open === second.key}
          dim={dim}
          onClick={() => setOpen(open === second.key ? null : second.key)}
          className={second.flex}
        />

        <Divider hidden={dim} />

        <div
          className={cn(
            "flex items-center gap-2 rounded-full pr-2 sm:flex-[1.2]",
            open === last.key && "bg-surface shadow-[var(--shadow-card)]",
          )}
        >
          <SegmentButton
            label={last.label}
            value={last.value}
            filled={last.filled}
            active={false}
            dim={dim && open !== last.key}
            onClick={() => setOpen(open === last.key ? null : last.key)}
            className="flex-1"
            bare
          />

          <button
            type="button"
            onClick={() => submit()}
            aria-label={t("search")}
            className={cn(
              "m-2 flex h-12 flex-none cursor-pointer items-center justify-center gap-2 rounded-full",
              "bg-brand text-on-brand transition-all duration-200 hover:bg-brand-deep",
              // Widens to reveal its label once a panel is open, the way a
              // primary action should announce itself only when it is next.
              dim ? "px-5" : "w-12 px-0",
            )}
          >
            <SearchIcon size={17} />
            {dim && <span className="text-[15px] font-semibold">{t("search")}</span>}
          </button>
        </div>
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-3 w-max max-w-[calc(100vw-2rem)] rounded-card border border-line",
            "bg-surface shadow-[var(--shadow-pop)]",
            open === "where" && "left-0 min-w-[min(26rem,calc(100vw-2rem))]",
            (open === "when" || open === "movein") && "left-1/2 -translate-x-1/2",
            (open === "who" || open === "bedrooms") && "right-0 min-w-[min(24rem,calc(100vw-2rem))]",
          )}
        >
          {open === "where" && (
            <WherePanel
              query={where}
              onQueryChange={setWhere}
              destinations={destinations}
              onSelect={(name) => {
                setWhere(name);
                setOpen(rent ? "movein" : "when");
              }}
              onSubmitText={(text) => submit(text)}
            />
          )}
          {open === "when" && (
            <>
              <WhenPanel value={when} onChange={setWhen} />
              {/*
                A panel that takes a decision has to offer a way out of itself.
                Without this the only exit was the Search button up in the pill,
                which the open panel visually dominates, so a completed date
                range looked like a dead end.
              */}
              <PanelFooter
                clearLabel={t("clearDates")}
                onClear={() =>
                  setWhen({ from: null, to: null, span: null, months: 12 })
                }
                clearDisabled={!when.from && !when.to && !when.span}
                primaryLabel={t("next")}
                onPrimary={() => setOpen("who")}
              />
            </>
          )}

          {open === "who" && (
            <>
              <WhoPanel party={party} onChange={setParty} />
              <PanelFooter
                clearLabel={t("clearGuests")}
                onClear={() =>
                  setParty({ adults: 1, children: 0, infants: 0 })
                }
                clearDisabled={
                  party.adults <= 1 && !party.children && !party.infants
                }
                primaryLabel={t("search")}
                onPrimary={() => submit()}
              />
            </>
          )}

          {open === "movein" && (
            <>
              <div className="grid grid-cols-3 gap-2 p-4 sm:w-[24rem]">
                {nextMonths(6).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonth(month === m ? "" : m)}
                    aria-pressed={month === m}
                    className={cn(
                      "min-h-14 cursor-pointer rounded-ctl border px-2 text-[14px] font-medium transition-colors",
                      month === m ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    {monthName(m, intlLocale)}
                  </button>
                ))}
              </div>
              <PanelFooter
                clearLabel={t("clear")}
                onClear={() => setMonth("")}
                clearDisabled={!month}
                primaryLabel={t("next")}
                onPrimary={() => setOpen("bedrooms")}
              />
            </>
          )}

          {open === "bedrooms" && (
            <>
              <div className="flex gap-2 p-4">
                {["", "1", "2", "3", "4"].map((b) => (
                  <button
                    key={b || "any"}
                    type="button"
                    onClick={() => setBeds(b)}
                    aria-pressed={beds === b}
                    className={cn(
                      "min-h-11 flex-1 cursor-pointer rounded-ctl border px-3 text-[14px] font-medium transition-colors",
                      beds === b ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    {b ? `${b}+` : tList("bedroomsAny")}
                  </button>
                ))}
              </div>
              <PanelFooter
                clearLabel={t("clear")}
                onClear={() => setBeds("")}
                clearDisabled={!beds}
                primaryLabel={t("search")}
                onPrimary={() => submit()}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** YYYY-MM for the next n months, matching what the lease panel offers. */
function nextMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function monthName(ym: string, locale: string): string {
  const [y, m] = ym.split("-").map(Number);
  return dateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function PanelFooter({
  clearLabel,
  onClear,
  clearDisabled,
  primaryLabel,
  onPrimary,
}: {
  clearLabel: string;
  onClear: () => void;
  clearDisabled?: boolean;
  primaryLabel: string;
  onPrimary: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5">
      <button
        type="button"
        onClick={onClear}
        disabled={clearDisabled}
        className={cn(
          "rounded-ctl px-2 py-1.5 text-[14px] font-semibold underline underline-offset-4",
          "transition-colors duration-150",
          clearDisabled
            ? "cursor-not-allowed text-ink-3/45 no-underline"
            : "cursor-pointer text-ink-2 hover:text-ink",
        )}
      >
        {clearLabel}
      </button>

      <button
        type="button"
        onClick={onPrimary}
        className={cn(
          "cursor-pointer rounded-ctl bg-brand px-5 py-2.5 text-[14px] font-semibold text-on-brand",
          "transition-colors duration-150 hover:bg-brand-deep",
        )}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function Divider({ hidden }: { hidden: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "hidden w-px self-center bg-line transition-opacity duration-200 sm:block sm:h-8",
        hidden && "opacity-0",
      )}
    />
  );
}

function SegmentButton({
  label,
  value,
  filled,
  active,
  dim,
  onClick,
  className,
  bare,
}: {
  label: string;
  value: string;
  filled: boolean;
  active: boolean;
  dim: boolean;
  onClick: () => void;
  className?: string;
  bare?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] cursor-pointer flex-col justify-center gap-0.5 px-6 py-2 text-left",
        "transition-colors duration-200",
        !bare && "rounded-full",
        !bare && active && "bg-surface shadow-[var(--shadow-card)]",
        !bare && !active && dim && "hover:bg-surface/60",
        !bare && !active && !dim && "hover:bg-surface-2",
        className,
      )}
    >
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <span
        suppressHydrationWarning
        className={cn(
          "truncate text-[14px]",
          filled ? "font-medium text-ink" : "text-ink-3",
        )}
      >
        {value}
      </span>
    </button>
  );
}

function summariseWhen(
  when: WhenValue,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  if (when.span === "long") {
    return t("monthsUnit", { count: when.months }) === ""
      ? null
      : `${when.months} ${t("monthsUnit", { count: when.months })}`;
  }
  if (when.from && when.to) return formatDateRange(when.from, when.to, locale);
  if (when.from) return formatDateRange(when.from, when.from, locale);
  return null;
}

function summariseParty(
  party: Party,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  const guests = party.adults + party.children;
  if (guests <= 1 && party.infants === 0) return null;

  const parts = [t("guestsSummary", { count: guests })];
  if (party.infants > 0) {
    parts.push(t("infantsSummary", { count: party.infants }));
  }
  return parts.join(", ");
}

export type { IsoDate };
