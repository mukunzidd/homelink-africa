import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

/**
 * The checkout step spine — a Booking.com convention we keep deliberately.
 * People have learned it, and checkout is where familiarity beats originality.
 *
 * Completed steps are marked with a word as well as a colour, so progress does
 * not depend on hue alone.
 */
const STEPS = ["dates", "guests", "review", "pay"] as const;

export async function StepSpine({ current }: { current: number }) {
  const t = await getTranslations("checkout");

  return (
    <nav aria-label={t("title")} className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
        {t("step", { current, total: STEPS.length })}
      </p>

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {STEPS.map((step, index) => {
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

              {position < STEPS.length && (
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
