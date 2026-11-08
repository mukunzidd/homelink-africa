"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { MoneyText } from "@/components/ui/money-text";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { RwfFigure } from "@/components/sale/rwf-figure";

/**
 * Buying's action. There is no "Buy now": a house is bought after a viewing,
 * a look at the papers and a notary, so the action is asking the Kigali team
 * to arrange the first of those.
 *
 * Messaging is not live yet, so the form says plainly that nothing was sent
 * rather than pretending — the same rule as every other unbuilt surface.
 */
export function EnquiryPanel({ price, perSqm }: { price: Money; perSqm: Money; homeName?: string }) {
  const t = useTranslations("sale");
  const tList = useTranslations("list");
  const [how, setHow] = useState<"inPerson" | "video">("inPerson");
  const [when, setWhen] = useState<"thisWeek" | "nextWeek" | "weekend">("thisWeek");
  const [done, setDone] = useState(false);

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

      {done ? (
        <div className="flex flex-col gap-2 rounded-ctl bg-ok-tint p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <CheckIcon className="text-ok" />
            {t("enquiryNoted")}
          </p>
          <p className="text-[13px] leading-relaxed text-ink-2">{t("enquiryPreview")}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
          className="flex flex-col gap-3"
        >
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-[13px] font-medium text-ink-2">{t("viewingLabel")}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-ctl bg-surface-2 p-1">
              {(["inPerson", "video"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={how === k}
                  onClick={() => setHow(k)}
                  className={cn(
                    "h-9 cursor-pointer rounded-inner text-[13px] transition-colors duration-150",
                    how === k ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(12,33,25,0.08)]" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {t(`viewing.${k}`)}
                </button>
              ))}
            </div>
          </fieldset>
          {/* A suggested time instead of a pre-written message: the old
              default quoted the home's name back in quotation marks and read
              as if a machine had written it. */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-[13px] font-medium text-ink-2">{tList("whenSuits")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {(["thisWeek", "nextWeek", "weekend"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={when === k}
                  onClick={() => setWhen(k)}
                  className={cn(
                    "min-h-8 cursor-pointer rounded-full border px-3 text-[13px] transition-colors",
                    when === k ? "border-brand bg-brand-tint font-medium text-brand-deep" : "border-line text-ink-2 hover:bg-surface-2",
                  )}
                >
                  {tList(`viewingWhen.${k}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
            {t("nameLabel")}
            <input required autoComplete="name" className="min-h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-brand" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
            {t("contactLabel")}
            <input required autoComplete="email" className="min-h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-brand" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
            {t("messageLabel")}
            <textarea
              rows={3}
              placeholder={tList("messagePlaceholder")}
              className="resize-none rounded-ctl border border-line bg-surface px-3 py-2.5 text-[15px] font-normal text-ink outline-none placeholder:text-ink-3 focus:border-brand"
            />
          </label>
          <Button type="submit" size="lg" fullWidth>
            {t("enquire")}
          </Button>
          <p className="text-center text-[12px] leading-relaxed text-ink-3">{t("noFunds")}</p>
        </form>
      )}
    </div>
  );
}
