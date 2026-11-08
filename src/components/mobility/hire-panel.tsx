"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { DriveMode, Vehicle } from "@/lib/domain/types";
import { quoteVehicle } from "@/lib/domain/pricing";
import { addDays, isIsoDate, type IsoDate } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { cn } from "@/lib/cn";

/**
 * Hire panel. Same posture as the stay booking panel — transaction density
 * inside a discovery page — with one substantive difference: a car is priced
 * per day including the pickup day, where a stay is priced per night and the
 * check-out day is not one.
 */
export function HirePanel({
  vehicle,
  defaultFrom,
  defaultTo,
}: {
  vehicle: Vehicle;
  defaultFrom: IsoDate;
  defaultTo: IsoDate;
}) {
  const t = useTranslations("cars");
  const tSearch = useTranslations("search");
  const tQuote = useTranslations("quote");
  const router = useRouter();

  const [from, setFrom] = useState<IsoDate | null>(defaultFrom);
  const [to, setTo] = useState<IsoDate | null>(defaultTo);

  // Some vehicles come with a driver and nothing else; there is no choice to
  // offer there, so the control collapses to a statement.
  const canSelfDrive = vehicle.driveModes.includes("selfDrive");
  const [driveMode, setDriveMode] = useState<DriveMode>(
    canSelfDrive ? "selfDrive" : "withDriver",
  );

  const quote = useMemo(() => {
    if (!isIsoDate(from) || !isIsoDate(to)) return null;
    return quoteVehicle(vehicle, from, to, driveMode);
  }, [vehicle, from, to, driveMode]);

  function hire() {
    if (!from || !to) return;
    const qs = new URLSearchParams({ from, to, driveMode });
    router.push(`/cars/${vehicle.slug}/book?${qs.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-1.5">
        <MoneyText
          amount={vehicle.dailyRate}
          className="text-xl font-semibold text-ink"
        />
        <span className="text-sm text-ink-3">{t("perDay")}</span>
      </div>

      <DateRangePicker
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          setTo(nextTo ?? (nextFrom ? addDays(nextFrom, 2) : null));
        }}
        labelFrom={t("pickUpLabel")}
        labelTo={t("dropOffLabel")}
      />

      {canSelfDrive ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-semibold text-ink-2">
            {t("driveMode")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(["selfDrive", "withDriver"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={driveMode === mode}
                onClick={() => setDriveMode(mode)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-ctl border px-3 py-2 text-[14px] font-semibold",
                  "transition-colors duration-150",
                  driveMode === mode
                    ? "border-brand bg-brand-tint text-brand"
                    : "border-line bg-surface text-ink hover:bg-surface-2",
                )}
              >
                {t(mode)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-ctl bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2">
          {t("driverOnly")}
        </p>
      )}

      {quote ? (
        <>
          <QuoteBreakdown
            quote={quote}
            unitRate={vehicle.dailyRate}
            units={quote.nights}
            className="border-t border-line pt-4"
          />
          <Button onClick={hire} fullWidth size="lg">
            {t("book")}
          </Button>
          <p className="text-center text-xs text-ink-3">
            {tQuote("noHiddenFees")}
          </p>
        </>
      ) : (
        <p className="border-t border-line pt-4 text-sm text-ink-3">
          {tSearch("when")}
        </p>
      )}
    </div>
  );
}
