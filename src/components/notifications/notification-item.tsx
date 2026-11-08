"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AppNotification, NotificationCategory } from "@/lib/domain/types";
import { formatAgo } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import {
  BanknoteIcon,
  CalendarIcon,
  KeyIcon,
  MessageIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const ICON: Record<NotificationCategory, typeof CalendarIcon> = {
  booking: CalendarIcon,
  payment: BanknoteIcon,
  message: MessageIcon,
  stay: KeyIcon,
  work: SparkIcon,
  system: ShieldIcon,
};

/**
 * One notification: what kind it is, what happened, how long ago, and
 * whether it has been seen. Unread is a dot and a heavier title, not a
 * coloured background, so a list of eight unread does not turn into a
 * block of tint.
 *
 * Failed payments carry the critical colour on their icon; it is the one
 * kind where not acting costs the person something.
 */
export function NotificationItem({
  n,
  now,
  onOpen,
  compact = false,
}: {
  n: AppNotification;
  now: Date;
  onOpen: (n: AppNotification) => void;
  compact?: boolean;
}) {
  const t = useTranslations("notifications");
  const locale = INTL_LOCALES[useLocale() as Locale];
  const Icon = ICON[n.category];
  const unread = !n.readAt;
  const urgent = n.kind === "paymentFailed" || n.kind === "momoPending";

  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 rounded-ctl text-left transition-colors hover:bg-surface-2",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-8 flex-none place-items-center rounded-full border",
          urgent ? "border-crit/30 bg-crit-tint text-crit" : "border-line bg-surface text-ink-2",
        )}
      >
        <Icon size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("text-[14px] leading-snug", unread ? "font-semibold text-ink" : "font-medium text-ink-2")}>
            {t(`kinds.${n.kind}.title`, n.params)}
          </span>
          <span className="tnum flex-none text-[12px] text-ink-3">{formatAgo(n.createdAt, now, locale)}</span>
        </span>
        <span className={cn("text-[13px] leading-snug text-ink-2", compact && "line-clamp-2")}>
          {t(`kinds.${n.kind}.body`, n.params)}
        </span>
      </span>
      <span
        aria-label={unread ? t("unread") : undefined}
        className={cn("mt-2 size-2 flex-none rounded-full", unread ? "bg-brand" : "bg-transparent")}
      />
    </button>
  );
}
