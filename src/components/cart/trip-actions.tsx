"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart-checks";
import { useToast } from "@/components/notifications/toaster";
import { CheckIcon, PlusIcon, SparkIcon } from "@/components/ui/icons";

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
  const toast = useToast();
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
  return (
    <button
      type="button"
      aria-pressed={inside}
      onClick={() => {
        if (inside) {
          router.push("/trip");
          return;
        }
        cart.add(item);
        toast.show({ title: t("added"), body: item.title, href: "/trip", tone: "ok" });
      }}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-ctl border border-brand bg-surface px-4 text-[15px] font-semibold text-brand hover:bg-brand-tint"
    >
      {inside ? <CheckIcon size={15} /> : <PlusIcon size={15} />}
      {inside ? t("inTrip") : t("add")}
    </button>
  );
}
