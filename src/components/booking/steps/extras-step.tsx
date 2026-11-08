"use client";

import { useTranslations } from "next-intl";
import type { ServiceKind } from "@/lib/domain/types";
import type { BookingDraft, DraftAction } from "@/lib/booking/draft";
import { EXTRAS, extraPrice, extrasFor, type ExtraKey } from "@/lib/domain/extras";
import { useCatalog } from "../catalog-context";
import { MoneyText } from "@/components/ui/money-text";
import {
  BowlIcon,
  CarIcon,
  CheckIcon,
  ClockIcon,
  MinusIcon,
  PlaneIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { StepSection } from "../fields";
import { cn } from "@/lib/cn";

const ICON: Record<ExtraKey, typeof PlaneIcon> = {
  airportPickup: PlaneIcon,
  earlyCheckIn: ClockIcon,
  lateCheckout: ClockIcon,
  groceries: BowlIcon,
  cot: UsersIcon,
  midStayClean: SparkIcon,
  childSeat: CarIcon,
  fullInsurance: ShieldIcon,
};

/**
 * Small things that make arriving easier, each a card with one button.
 *
 * Adding is one tap and shows at once in the summary's total. Extras that
 * can be had more than once (a clean per visit, two child seats) turn their
 * button into a stepper once added, rather than asking for a number up
 * front.
 */
export function ExtrasStep({
  draft,
  dispatch,
  lane,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  lane: ServiceKind;
}) {
  const t = useTranslations("booking.extras");
  const tx = useTranslations("extras");
  const catalog = useCatalog();
  const keys = extrasFor(lane, catalog);
  const qty = (k: ExtraKey) => draft.extras.find((e) => e.key === k)?.quantity ?? 0;
  const setQty = (k: ExtraKey, n: number) =>
    dispatch({
      type: "extras",
      value: [...draft.extras.filter((e) => e.key !== k), ...(n > 0 ? [{ key: k, quantity: n }] : [])],
    });

  if (!keys.length) {
    return (
      <StepSection title={t("title")}>
        <p className="text-[14px] text-ink-2">{t("none")}</p>
      </StepSection>
    );
  }

  return (
    <StepSection title={t("title")} body={t("body")}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {keys.map((k) => {
          const extra = { ...EXTRAS[k], price: extraPrice(k, catalog) };
          const n = qty(k);
          const Icon = ICON[k];
          const name = tx(`${k}.name`);
          return (
            <li
              key={k}
              className={cn(
                "flex flex-col gap-3 rounded-ctl border p-4 transition-colors",
                n > 0 ? "border-brand bg-brand-tint/50" : "border-line bg-surface",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 flex-none place-items-center rounded-full",
                    n > 0 ? "bg-brand text-on-brand" : "bg-surface-2 text-ink-2",
                  )}
                >
                  <Icon size={16} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-[15px] font-semibold text-ink">{name}</p>
                  <p className="text-[13px] leading-snug text-ink-2">{tx(`${k}.body`)}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <p className="text-[14px]">
                  {extra.price.minor === 0 ? (
                    <span className="font-semibold text-ok">{t("free")}</span>
                  ) : (
                    <>
                      <MoneyText amount={extra.price} className="font-semibold text-ink" />
                      <span className="text-ink-3"> {t(extra.unit)}</span>
                    </>
                  )}
                </p>
                {n > 0 && extra.maxQuantity > 1 ? (
                  <div className="flex items-center gap-1 rounded-ctl border border-brand/40 bg-surface">
                    <button type="button" onClick={() => setQty(k, n - 1)} aria-label={t("decrease", { name })} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-brand hover:bg-brand-tint">
                      <MinusIcon size={14} />
                    </button>
                    <span className="tnum w-5 text-center text-[15px] font-semibold text-ink" aria-live="polite">
                      {n}
                    </span>
                    <button type="button" onClick={() => setQty(k, Math.min(n + 1, extra.maxQuantity))} disabled={n >= extra.maxQuantity} aria-label={t("increase", { name })} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-brand hover:bg-brand-tint disabled:opacity-40">
                      <PlusIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={n > 0}
                    aria-label={n > 0 ? t("remove", { name }) : undefined}
                    onClick={() => setQty(k, n > 0 ? 0 : 1)}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-ctl px-3.5 text-[14px] font-semibold transition-colors",
                      n > 0 ? "bg-brand text-on-brand hover:bg-brand-deep" : "border border-line bg-surface text-ink hover:border-brand hover:text-brand",
                    )}
                  >
                    {n > 0 ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                    {n > 0 ? t("added") : t("add")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </StepSection>
  );
}
