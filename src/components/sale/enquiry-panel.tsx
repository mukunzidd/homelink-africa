"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Money } from "@/lib/domain/money";
import { MoneyText } from "@/components/ui/money-text";
import { RwfFigure } from "@/components/sale/rwf-figure";

/**
 * Buying's action. There is no "Buy now": a house is bought after a viewing,
 * a look at the papers and a notary, so the action is asking the Kigali team
 * to arrange the first of those.
 *
 * Messaging is not live yet, so the form says plainly that nothing was sent
 * rather than pretending — the same rule as every other unbuilt surface.
 */
export function EnquiryPanel({ price, perSqm, slug }: { price: Money; perSqm: Money; slug: string; homeName?: string }) {
  const t = useTranslations("sale");
  const tv = useTranslations("booking.viewing");

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-ink-3">{t("askingPrice")}</span>
        <MoneyText amount={price} rounded className="text-2xl font-semibold text-ink" />
        <RwfFigure amount={price} className="text-[14px] font-medium text-ink-2" />
        <span className="text-[13px] text-ink-3">
          <MoneyText amount={perSqm} rounded /> {t("perSqm")}
        </span>
      </div>

      {/* A viewing is booked on its own page now: a real day and hour,
          not "this week" typed into a message. */}
      <Link
        href={`/buy/${slug}/viewing`}
        className="flex min-h-12 items-center justify-center rounded-ctl bg-brand px-5 text-[16px] font-semibold text-on-brand hover:bg-brand-deep"
      >
        {tv("button")}
      </Link>
      <p className="text-center text-[12px] leading-relaxed text-ink-3">{t("noFunds")}</p>
    </div>
  );
}
