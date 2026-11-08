import { getTranslations } from "next-intl/server";
import type { ServiceKind } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/**
 * The checkout step spine — a Booking.com convention we keep deliberately.
 * People have learned it, and checkout is where familiarity beats originality.
 *
 * Completed steps are marked with a word as well as a colour, so progress does
 * not depend on hue alone.
 *
 * Three steps, not four. Review and Pay were separate, but the checkout page
 * is both at once (it is titled "Confirm and pay" and takes the payment), so
 * the spine sat on Review while the reader was paying and never reached Pay.
 *
 * The middle step is named for what that lane actually asked: a hire has no
 * guests, it has a driver choice; a day out has people. Dates is Day for a
 * day out because it is one date.
 *
 * `current` past the last step marks every step done, which is how the
 * confirmation page shows a finished booking.
 */
const STEPS: Record<ServiceKind, readonly string[]> = {
  stay: ["dates", "guests", "reviewPay"],
  car: ["dates", "driver", "reviewPay"],
  experience: ["day", "people", "reviewPay"],
};

export async function StepSpine({
  current,
  lane,
}: {
  current: number;
  lane: ServiceKind;
}) {
  const t = await getTranslations("checkout");
  const steps = STEPS[lane];
  const finished = current > steps.length;

  return (
    <nav aria-label={t("title")} className="flex flex-col gap-2">
      {/* "Step 4 of 3" on the confirmation page is the counter's only way to
          say done, so it says nothing there and the ticks carry it. */}
      {!finished && (
        <p className="text-xs font-medium text-ink-3">
          {t("step", { current, total: steps.length })}
        </p>
      )}

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {steps.map((step, index) => {
          const position = index + 1;
          const done = position < current;
          const active = position === current;

          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold",
                  active && "bg-brand-tint text-brand",
                  done && "text-ok",
                  !active && !done && "text-ink-3",
                )}
              >
                {done && (
                  <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M3.5 8.4l3 3 6-6.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {t(`steps.${step}`)}
              </span>

              {position < steps.length && (
                <span aria-hidden="true" className="text-ink-3">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
