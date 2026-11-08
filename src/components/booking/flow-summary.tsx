"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Quote } from "@/lib/domain/pricing";
import type { Money } from "@/lib/domain/money";
import { toDisplayQuote } from "@/lib/domain/pricing";
import { usePreferences } from "@/lib/preferences/context";
import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ChevronDownIcon, ShieldIcon } from "@/components/ui/icons";
import { HoldTimer } from "./hold-timer";
import type { FlowText } from "./types";
import { cn } from "@/lib/cn";

type Props = {
  text: FlowText;
  quote: Quote | null;
  unitRate: Money;
  units: number;
  holdStartedAt: string;
  onExpire: () => void;
};

/**
 * What you are buying and what it costs, kept in view while you fill in
 * everything else. Every change upstream (an extra, a promo) shows here at
 * once, so the total never surprises anyone at the pay button.
 */
export function FlowSummary(props: Props) {
  const { text, quote, unitRate, units, holdStartedAt, onExpire } = props;
  const t = useTranslations("booking.summary");
  const tVerify = useTranslations("verification");

  return (
    <aside className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)]">
      <SupplyImage seed={text.imageSeed} src={text.image} alt={text.title} sizes="380px" className="h-40" />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[16px] font-semibold leading-snug text-ink">{text.title}</h2>
            <Link href={text.changeHref} className="flex-none rounded-ctl text-[13px] font-semibold text-brand hover:text-brand-deep">
              {t("change")}
            </Link>
          </div>
          <p className="tnum text-[14px] text-ink-2">{text.range}</p>
          <p className="text-[13px] text-ink-3">{text.facts.join(" · ")}</p>
          <VerifiedBadge label={tVerify("badge")} size="sm" className="mt-1 self-start" />
        </div>

        <HoldTimer startedAt={holdStartedAt} onExpire={onExpire} />

        {quote && (
          <div className="border-t border-line pt-4">
            <QuoteBreakdown quote={quote} unitRate={unitRate} units={units} />
          </div>
        )}

        {text.freeLine && (
          <p className="flex items-start gap-2 rounded-ctl bg-ok-tint/60 px-3 py-2.5 text-[13px] text-ink-2">
            <ShieldIcon size={15} className="mt-0.5 text-ok" />
            {text.freeLine}
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * The phone's version: one bar with the total, which opens into the full
 * breakdown. Below the step indicator, above the step, so the price is the
 * second thing seen on every step rather than something to scroll for.
 */
export function FlowSummaryBar(props: Props) {
  const { text, quote, unitRate, units, holdStartedAt, onExpire } = props;
  const t = useTranslations("booking.summary");
  const { display, currency, fx } = usePreferences();
  const [open, setOpen] = useState(false);
  const total = quote ? display(toDisplayQuote(quote, currency, fx).total) : "";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 p-3 text-left"
      >
        <SupplyImage seed={text.imageSeed} src={text.image} alt="" sizes="64px" className="size-14 flex-none rounded-inner" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold text-ink">{text.title}</span>
          <span className="tnum truncate text-[12.5px] text-ink-3">{text.range}</span>
        </span>
        <span className="flex flex-none flex-col items-end">
          <span className="tnum text-[15px] font-semibold text-ink">{total}</span>
          <span className="flex items-center gap-0.5 text-[12px] text-brand">
            {open ? t("hide") : t("show")}
            <ChevronDownIcon size={12} className={cn("transition-transform", open && "rotate-180")} />
          </span>
        </span>
      </button>
      <div className={open ? "flex flex-col gap-3 border-t border-line p-4" : "hidden"}>
        <p className="text-[13px] text-ink-3">{text.facts.join(" · ")}</p>
        {quote && <QuoteBreakdown quote={quote} unitRate={unitRate} units={units} />}
        {text.freeLine && <p className="text-[13px] text-ok">{text.freeLine}</p>}
      </div>
      <div className="border-t border-line-soft px-3 py-2">
        <HoldTimer startedAt={holdStartedAt} onExpire={onExpire} />
      </div>
    </div>
  );
}
