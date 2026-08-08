"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange, type IsoDate } from "@/lib/domain/dates";
import { staySearchToQuery, type StaySearch } from "@/lib/search-params";
import { useDismissable } from "@/lib/use-dismissable";
import { SearchIcon } from "@/components/ui/icons";
import { WherePanel, type Destination } from "./panels/where-panel";
import { WhenPanel, type WhenValue } from "./panels/when-panel";
import { WhoPanel, partySize, type Party } from "./panels/who-panel";
import { cn } from "@/lib/cn";

type Segment = "where" | "when" | "who";

/**
 * One search control, three segments, one open panel at a time.
 *
 * Replaces four separate bordered boxes. That arrangement kept falling out of
 * alignment because each field was a different element with its own line box —
 * but the deeper problem was that four boxes read as four decisions. A pill
 * with segments reads as one decision with three parts, which is what it is.
 *
 * The whole bar dims when a panel is open and the active segment stays lit, so
 * the thing being edited is unambiguous without a heavy focus ring.
 */
export function SearchPill({
  search,
  destinations,
  variant = "results",
}: {
  search: StaySearch;
  destinations: Destination[];
  variant?: "results" | "hero";
}) {
  const t = useTranslations("searchPanel");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<Segment | null>(null);
  const [where, setWhere] = useState(search.neighbourhood ?? "");
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

  useDismissable(rootRef, open !== null, () => setOpen(null));

  function submit() {
    setOpen(null);
    const query = staySearchToQuery({
      ...search,
      neighbourhood: where || undefined,
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

  const dim = open !== null;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex flex-col rounded-card border border-line sm:flex-row sm:items-stretch sm:rounded-full",
          "transition-colors duration-200",
          dim ? "bg-surface-2" : "bg-surface",
          variant === "hero" ? "shadow-[var(--shadow-pop)]" : "shadow-[var(--shadow-card)]",
        )}
      >
        <SegmentButton
          label={t("whereLabel")}
          value={where || t("whereValue")}
          filled={!!where}
          active={open === "where"}
          dim={dim}
          onClick={() => setOpen(open === "where" ? null : "where")}
          className="sm:flex-[1.4] sm:rounded-l-full"
        />

        <Divider hidden={dim} />

        <SegmentButton
          label={t("whenLabel")}
          value={whenSummary ?? t("whenValue")}
          filled={!!whenSummary}
          active={open === "when"}
          dim={dim}
          onClick={() => setOpen(open === "when" ? null : "when")}
          className="sm:flex-[1.3]"
        />

        <Divider hidden={dim} />

        <div
          className={cn(
            "flex items-center gap-2 rounded-full pr-2 sm:flex-[1.2]",
            open === "who" && "bg-surface shadow-[var(--shadow-card)]",
          )}
        >
          <SegmentButton
            label={t("whoLabel")}
            value={whoSummary ?? t("whoValue")}
            filled={!!whoSummary}
            active={false}
            dim={dim && open !== "who"}
            onClick={() => setOpen(open === "who" ? null : "who")}
            className="flex-1"
            bare
          />

          <button
            type="button"
            onClick={submit}
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
            open === "where" && "left-0 min-w-[26rem]",
            open === "when" && "left-1/2 -translate-x-1/2",
            open === "who" && "right-0 min-w-[24rem]",
          )}
        >
          {open === "where" && (
            <WherePanel
              query={where}
              onQueryChange={setWhere}
              destinations={destinations}
              onSelect={(name) => {
                setWhere(name);
                setOpen("when");
              }}
            />
          )}
          {open === "when" && (
            <>
              <WhenPanel value={when} onChange={setWhen} />
              {/*
                A panel that takes a decision has to offer a way out of itself.
                Without this the only exit was the Search button up in the pill,
                which the open panel visually dominates — so a completed date
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
                onPrimary={submit}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
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
