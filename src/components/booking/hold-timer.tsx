"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { holdSecondsLeft } from "@/lib/domain/policies";
import { ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * How long the dates stay held. Quiet until the last five minutes, warning
 * colour in the last two, and it tells the shell when it reaches zero.
 *
 * Renders nothing until mounted: the server's clock and the browser's would
 * disagree by a second and fail hydration over a countdown.
 */
export function HoldTimer({ startedAt, onExpire }: { startedAt: string; onExpire: () => void }) {
  const t = useTranslations("booking.hold");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const s = holdSecondsLeft(startedAt, new Date());
      setLeft(s);
      if (s === 0) onExpire();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, onExpire]);

  if (left === null || left === 0) return null;
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const warn = left <= 120;

  return (
    <p
      role={warn ? "status" : undefined}
      className={cn(
        "tnum inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium",
        warn ? "bg-warn-tint text-warn" : "bg-surface-2 text-ink-2",
      )}
    >
      <ClockIcon size={13} />
      {warn ? t("warn", { time }) : t("label", { time })}
    </p>
  );
}
