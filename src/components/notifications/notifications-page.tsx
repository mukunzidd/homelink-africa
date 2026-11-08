import { getTranslations } from "next-intl/server";
import type { NotificationCategory, Role } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { paginate, pageParam } from "@/lib/paginate";
import { Link } from "@/i18n/navigation";
import { Pager } from "@/components/ui/pager";
import { MarkAllRead, NotificationList } from "./notification-list";
import { cn } from "@/lib/cn";

const CATEGORIES: NotificationCategory[] = ["booking", "payment", "message", "stay", "work", "system"];
const PER_PAGE = 8;

/**
 * Every notification a role has, with the filters in the URL so a filtered
 * view survives a refresh and the browser's back button. Shared by the
 * guest's /notifications and the workspace's /manage/notifications.
 */
export async function NotificationsPage({
  role,
  base,
  searchParams,
  heading,
}: {
  role: Role;
  base: string;
  searchParams: { category?: string; unread?: string; page?: string };
  heading: (actions: React.ReactNode) => React.ReactNode;
}) {
  const t = await getTranslations("notifications");
  const category = CATEGORIES.find((c) => c === searchParams.category);
  const unreadOnly = searchParams.unread === "1";
  const all = await repos().notifications.forRole(role, { category, unreadOnly });
  const unread = await repos().notifications.unreadCount(role);
  // Only categories this role actually has, so a guest is not offered "Work".
  const mine = new Set((await repos().notifications.forRole(role)).map((n) => n.category));
  const page = paginate(all, pageParam(searchParams.page), PER_PAGE);

  const href = (next: { category?: string | null; unread?: boolean; page?: number }) => {
    const q = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const u = next.unread ?? unreadOnly;
    if (c) q.set("category", c);
    if (u) q.set("unread", "1");
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full border px-3.5 text-[14px] transition-colors",
      active ? "border-brand bg-brand-tint font-medium text-brand-deep" : "border-line bg-surface text-ink-2 hover:text-ink",
    );

  return (
    <div className="flex flex-col gap-6">
      {heading(unread > 0 ? <MarkAllRead /> : null)}

      <nav aria-label={t("filterLabel")} className="flex flex-wrap items-center gap-2">
        <Link href={href({ unread: false, page: 1 })} className={chip(!unreadOnly)} aria-current={!unreadOnly ? "true" : undefined}>
          {t("all")}
        </Link>
        <Link href={href({ unread: true, page: 1 })} className={chip(unreadOnly)} aria-current={unreadOnly ? "true" : undefined}>
          {t("unread")}
          {unread > 0 ? ` · ${unread}` : ""}
        </Link>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
        <Link href={href({ category: null, page: 1 })} className={chip(!category)}>
          {t("allCategories")}
        </Link>
        {CATEGORIES.filter((c) => mine.has(c)).map((c) => (
          <Link key={c} href={href({ category: c, page: 1 })} className={chip(category === c)} aria-current={category === c ? "true" : undefined}>
            {t(`categories.${c}`)}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-6 py-12 text-center text-[15px] text-ink-3">
          {unreadOnly ? t("emptyUnread") : t("empty")}
        </p>
      ) : (
        <NotificationList items={page.items} now={new Date().toISOString()} />
      )}

      <Pager page={page} hrefFor={(p) => href({ page: p })} />
    </div>
  );
}
