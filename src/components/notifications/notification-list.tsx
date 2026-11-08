"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { AppNotification } from "@/lib/domain/types";
import { useRouter } from "@/i18n/navigation";
import { groupByDay } from "@/lib/notifications/group";
import { markAllNotificationsRead, markNotificationsRead } from "@/app/actions/notifications";
import { NotificationItem } from "./notification-item";
import { notifyChanged } from "./use-unread";

/**
 * The full list's rows, grouped by Kigali day. The server picks the rows
 * (role, filters, page); this only renders them and handles the clicks.
 * `now` comes from the server so the relative times match its grouping.
 */
export function NotificationList({ items, now }: { items: AppNotification[]; now: string }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const at = useMemo(() => new Date(now), [now]);
  const groups = groupByDay(items, at);

  async function open(n: AppNotification) {
    if (!n.readAt) {
      await markNotificationsRead([n.id]);
      notifyChanged();
    }
    router.push(n.href);
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.group} className="flex flex-col">
          <h2 className="pb-2 text-[13px] font-medium text-ink-3">{t(`groups.${g.group}`)}</h2>
          <div className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface p-1">
            {g.items.map((n) => (
              <NotificationItem key={n.id} n={n} now={at} onOpen={open} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MarkAllRead() {
  const t = useTranslations("notifications");
  return (
    <button
      type="button"
      onClick={async () => {
        await markAllNotificationsRead();
        notifyChanged();
      }}
      className="inline-flex h-9 cursor-pointer items-center rounded-ctl border border-line bg-surface px-3 text-[14px] font-semibold text-ink-2 hover:border-brand hover:text-brand"
    >
      {t("markAll")}
    </button>
  );
}
