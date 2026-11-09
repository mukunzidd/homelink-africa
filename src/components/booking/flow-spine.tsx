"use client";

import { useTranslations } from "next-intl";
import type { StepKey } from "@/lib/booking/draft";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Where you are in the booking. Dates are always done (they were chosen on
 * the listing), then the lane's own steps. Done steps are buttons back to
 * themselves; steps not reached yet are plain text, because a link to a step
 * that would bounce you straight back is a trap.
 *
 * On a phone the row would wrap into three lines, so it becomes a counter
 * and a progress bar with the current step's name.
 */
export function FlowSpine({
  steps,
  current,
  isDone,
  onGo,
}: {
  steps: readonly StepKey[];
  current: StepKey;
  isDone: (s: StepKey) => boolean;
  onGo: (s: StepKey) => void;
}) {
  const t = useTranslations("booking");
  const all = ["dates" as const, ...steps];
  const index = all.indexOf(current);

  return (
    <nav aria-label={t("stepOf", { current: index, total: steps.length })}>
      {/* Phone */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-ink">{t(`steps.${current}`)}</span>
          <span className="tnum text-ink-3">{t("stepOf", { current: index, total: steps.length })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${(index / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop */}
      <ol className="hidden items-center md:flex">
        {all.map((s, i) => {
          const active = s === current;
          const done = s === "dates" || (i < index && isDone(s as StepKey));
          const reachable = s !== "dates" && i < index;
          const inner = (
            <>
              <span
                className={cn(
                  "tnum grid size-6 flex-none place-items-center rounded-full text-[12px] font-semibold",
                  active
                    ? "bg-brand text-on-brand"
                    : done
                      ? "bg-ok-tint text-ok"
                      : "border border-line bg-surface text-ink-3",
                )}
              >
                {done && !active ? <CheckIcon size={12} /> : i}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[14px]",
                  active ? "font-semibold text-ink" : done ? "font-medium text-ink-2" : "text-ink-3",
                )}
              >
                {t(`steps.${s}`)}
              </span>
            </>
          );
          return (
            <li key={s} className="flex min-w-0 items-center">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onGo(s as StepKey)}
                  className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-surface-2"
                >
                  {inner}
                </button>
              ) : (
                <span aria-current={active ? "step" : undefined} className="flex items-center gap-2 py-1 pl-1 pr-2.5">
                  {inner}
                </span>
              )}
              {i < all.length - 1 && (
                <span aria-hidden="true" className={cn("mx-1 h-px w-6 flex-none lg:w-10", i < index ? "bg-ok/50" : "bg-line")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
