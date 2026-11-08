"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ADDED, useCart } from "@/lib/cart";
import { cartTotal } from "@/lib/cart-checks";
import { usePreferences } from "@/lib/preferences/context";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * What just went into the trip, and the way to it, within reach of the
 * thumb that pressed "Add to trip".
 *
 * A toast said the same thing and was gone in four seconds, and the pill in
 * the header is the far corner of the screen from the button. The tray
 * stays until it is closed or the trip is opened. On a phone it sits above
 * the bar pinned to the bottom of detail pages, so it never covers Reserve.
 */
export function TripTray() {
  const t = useTranslations("cart");
  const tSearch = useTranslations("search");
  const { display, currency, fx } = usePreferences();
  const cart = useCart();
  const pathname = usePathname();
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    const onAdd = (e: Event) => setLastId((e as CustomEvent<string>).detail);
    window.addEventListener(ADDED, onAdd);
    return () => window.removeEventListener(ADDED, onAdd);
  }, []);

  useEffect(() => {
    if (!lastId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLastId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lastId]);

  const onTrip = pathname === "/trip" || pathname.startsWith("/trip/");
  const added = cart.items.find((i) => i.id === lastId);
  if (!added || onTrip || !cart.enabled) return null;

  const others = cart.items.filter((i) => i.id !== added.id);
  const count = cart.items.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 z-[45] flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-[var(--shadow-pop)]",
        "bottom-[calc(88px+env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[360px]",
        "animate-[rise_200ms_cubic-bezier(0.22,1,0.36,1)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="grid size-5 place-items-center rounded-full bg-brand text-on-brand">
            <CheckIcon size={12} />
          </span>
          {t("added")}
        </p>
        <button
          type="button"
          onClick={() => setLastId(null)}
          aria-label={t("trayClose")}
          className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <SupplyImage seed={added.imageSeed ?? added.slug} src={added.image} alt="" sizes="56px" className="size-14 flex-none rounded-inner" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-ink">{added.title}</p>
          <p className="tnum text-[13px] text-ink-3">{tSearch("guestCount", { count: added.party })}</p>
        </div>
      </div>

      {others.length > 0 && (
        <div className="flex items-center gap-2 border-t border-line-soft pt-3">
          <div className="flex -space-x-2">
            {others.slice(0, 3).map((i) => (
              <SupplyImage key={i.id} seed={i.imageSeed ?? i.slug} src={i.image} alt="" sizes="28px" className="size-7 rounded-full border-2 border-surface" />
            ))}
          </div>
          <p className="text-[13px] text-ink-2">{t("trayAlso", { count: others.length })}</p>
        </div>
      )}

      <Link
        href="/trip"
        onClick={() => setLastId(null)}
        className="flex min-h-11 items-center justify-between gap-3 rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
      >
        <span>{t("viewCount", { count })}</span>
        <span className="flex items-center gap-2">
          <span className="tnum font-medium opacity-90">{display(cartTotal(cart.items, currency, fx))}</span>
          <ArrowRightIcon size={15} />
        </span>
      </Link>
    </div>
  );
}
