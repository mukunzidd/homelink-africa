"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { cartBlocked, cartIssues, cartTimeline, cartTotal, type CartIssue } from "@/lib/cart-checks";
import { toDisplayQuote } from "@/lib/domain/pricing";
import { usePreferences } from "@/lib/preferences/context";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Dialog } from "@/components/ui/dialog";
import { SupplyImage } from "@/components/ui/supply-image";
import { CarIcon, CloseIcon, CompassIcon, HouseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const KIND_ICON = { stay: HouseIcon, car: CarIcon, experience: CompassIcon } as const;

/**
 * The trip, day by day. Problems sit on the item they concern, in red if
 * they stop checkout and in amber if they are only worth knowing; the
 * checkout button says why it is off when it is. Suggestions fill the gaps
 * a trip usually has: no car yet, no day out yet.
 */
export function TripPage() {
  const t = useTranslations("cart");
  const tSearch = useTranslations("search");
  const locale = INTL_LOCALES[useLocale() as Locale];
  const { display, currency, fx } = usePreferences();
  const cart = useCart();
  const router = useRouter();
  const [confirmOff, setConfirmOff] = useState(false);
  const today = kigaliDay();
  const issues = cartIssues(cart.items, today);
  const issueFor = (id: string): CartIssue | undefined => issues.find((i) => i.itemIds.includes(id));
  const blocked = cartBlocked(cart.items, today);
  const day = (d: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const short = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  if (!cart.items.length) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-8">
        <p className="text-[15px] text-ink-2">{t("empty")}</p>
        <Link href="/stays" className="inline-flex min-h-11 items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand">
          {t("browseStays")}
        </Link>
      </div>
    );
  }

  const hasCar = cart.items.some((i) => i.kind === "car");
  const hasDay = cart.items.some((i) => i.kind === "experience");

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        {cartTimeline(cart.items).map((g) => (
          <section key={g.date} className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold text-ink-3">{day(g.date)}</h2>
            {g.items.map((i) => {
              const Icon = KIND_ICON[i.kind];
              const issue = issueFor(i.id);
              return (
                <article
                  key={i.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-card border bg-surface p-4",
                    issue?.blocking ? "border-crit/60" : issue ? "border-warn/50" : "border-line",
                  )}
                >
                  <div className="flex gap-4">
                    <SupplyImage seed={i.imageSeed ?? i.slug} src={i.image} alt="" sizes="96px" className="size-20 flex-none rounded-inner sm:size-24" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
                        <Icon size={13} />
                        {i.bookedReference ? t("booked") : null}
                      </p>
                      <p className="text-[16px] font-semibold leading-snug text-ink">{i.title}</p>
                      <p className="tnum text-[13.5px] text-ink-2">
                        {i.start === i.end ? short(i.start) : `${short(i.start)} – ${short(i.end)}`} · {tSearch("guestCount", { count: i.party })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      {!i.bookedReference && (
                        <button
                          type="button"
                          onClick={() => cart.remove(i.id)}
                          aria-label={t("remove", { name: i.title })}
                          className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink"
                        >
                          <CloseIcon size={15} />
                        </button>
                      )}
                      <p className={cn("tnum text-[15px] font-semibold", i.bookedReference ? "text-ink-3 line-through" : "text-ink")}>
                        {display(toDisplayQuote(i.quote, currency, fx).total)}
                      </p>
                    </div>
                  </div>
                  {issue && (
                    <p role={issue.blocking ? "alert" : undefined} className={cn("rounded-ctl px-3 py-2 text-[13px]", issue.blocking ? "bg-crit-tint text-crit" : "bg-warn-tint text-warn")}>
                      {t(`issues.${issue.code}`)}
                    </p>
                  )}
                </article>
              );
            })}
          </section>
        ))}

        {(!hasCar || !hasDay) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {!hasCar && (
              <Link href="/cars" className="flex flex-col gap-1 rounded-card border border-dashed border-line bg-surface p-4 hover:border-brand">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><CarIcon size={16} />{t("suggestCar")}</span>
                <span className="text-[13px] text-ink-2">{t("suggestCarBody")}</span>
                <span className="text-[13px] font-semibold text-brand">{t("suggestCarCta")} →</span>
              </Link>
            )}
            {!hasDay && (
              <Link href="/experiences" className="flex flex-col gap-1 rounded-card border border-dashed border-line bg-surface p-4 hover:border-brand">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><CompassIcon size={16} />{t("suggestDay")}</span>
                <span className="text-[13px] text-ink-2">{t("suggestDayBody")}</span>
                <span className="text-[13px] font-semibold text-brand">{t("suggestDayCta")} →</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-[calc(var(--header-offset)+24px)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-semibold text-ink">{t("total")}</p>
          <p className="tnum text-xl font-semibold text-ink">{display(cartTotal(cart.items, currency, fx))}</p>
        </div>
        <button
          type="button"
          disabled={blocked}
          onClick={() => router.push("/trip/checkout")}
          className="min-h-12 cursor-pointer rounded-ctl bg-brand px-5 text-[16px] font-semibold text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("checkout")}
        </button>
        {blocked && <p className="text-[13px] text-crit">{t("blocked")}</p>}
        <button type="button" onClick={() => setConfirmOff(true)} className="cursor-pointer self-center rounded-ctl text-[13px] font-semibold text-ink-2 hover:text-ink">
          {t("turnOff")}
        </button>
      </aside>

      <Dialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        title={t("turnOffTitle")}
        description={t("turnOffBody")}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setConfirmOff(false)} className="min-h-11 cursor-pointer rounded-ctl border border-line px-4 text-[15px] font-semibold text-ink">
              {t("keep")}
            </button>
            <button
              type="button"
              onClick={() => {
                cart.disable();
                setConfirmOff(false);
                router.push("/stays");
              }}
              className="min-h-11 cursor-pointer rounded-ctl bg-crit px-4 text-[15px] font-semibold text-white"
            >
              {t("turnOffConfirm")}
            </button>
          </>
        }
      />
    </div>
  );
}
