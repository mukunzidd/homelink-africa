"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { RouteIcon } from "@/components/ui/icons";

/** In the header only while the cart is on: where the trip is, and how much is in it. */
export function TripPill() {
  const t = useTranslations("cart");
  const { enabled, items } = useCart();
  if (!enabled) return null;
  return (
    <Link
      href="/trip"
      aria-label={t("pillLabel", { count: items.length })}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand/40 bg-brand-tint px-2.5 text-[13px] font-semibold text-brand-deep hover:border-brand"
    >
      <RouteIcon size={15} />
      <span className="hidden sm:inline">{t("pill")}</span>
      <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] text-on-brand">{items.length}</span>
    </Link>
  );
}
