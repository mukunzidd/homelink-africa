"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart-checks";
import { ArrowRightIcon, CheckIcon, PlusIcon, SparkIcon } from "@/components/ui/icons";

/**
 * The cart's two doors, placed under a detail page's main button.
 *
 * With the cart off, a stay offers to plan a trip around it: one quiet
 * card, after dates are picked, never in the way of Reserve. With the cart
 * on, every lane offers "Add to trip" beside its own button.
 */
export function TripActions({ item, offerPlan = false }: { item: CartItem | null; offerPlan?: boolean }) {
  const t = useTranslations("cart");
  const cart = useCart();
  const router = useRouter();
  if (!item) return null;

  if (!cart.enabled) {
    if (!offerPlan) return null;
    return (
      <div className="flex flex-col gap-2 rounded-ctl border border-dashed border-brand/40 bg-brand-tint/40 p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <SparkIcon size={15} className="text-brand" />
          {t("planTitle")}
        </p>
        <p className="text-[13px] leading-relaxed text-ink-2">{t("planBody")}</p>
        <button
          type="button"
          onClick={() => {
            cart.enable(item);
            router.push("/trip");
          }}
          className="min-h-11 cursor-pointer rounded-ctl border border-brand bg-surface px-4 text-[14px] font-semibold text-brand hover:bg-brand-tint"
        >
          {t("planButton")}
        </button>
      </div>
    );
  }

  const inside = cart.items.some((i) => i.id === item.id);
  if (inside) {
    // Once it is in, the button's job is the way to the trip, with the
    // count, so "where did it go" never needs the header.
    return (
      <div className="flex items-stretch gap-2">
        <span className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-ctl bg-brand-tint px-3 text-[14px] font-semibold text-brand-deep">
          <CheckIcon size={15} />
          {t("inTrip")}
        </span>
        <Link
          href="/trip"
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ctl border border-brand bg-surface px-3 text-[14px] font-semibold text-brand hover:bg-brand-tint"
        >
          {t("viewCount", { count: cart.items.length })}
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => cart.add(item)}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-ctl border border-brand bg-surface px-4 text-[15px] font-semibold text-brand hover:bg-brand-tint"
    >
      <PlusIcon size={15} />
      {t("add")}
    </button>
  );
}
