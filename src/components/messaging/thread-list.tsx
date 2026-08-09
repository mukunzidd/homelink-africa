import { getTranslations } from "next-intl/server";
import type { Conversation } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { formatStamp } from "@/lib/domain/instants";
import { cn } from "@/lib/cn";

/**
 * Every thread this person is in.
 *
 * Selection lives in the URL rather than in component state, so a thread can
 * be linked to from a booking row, opened in a new tab, and reached by the
 * back button. It also keeps the whole screen a server component: there is
 * nothing here a client render would do better.
 */
export async function ThreadList({
  conversations,
  activeId,
  locale,
}: {
  conversations: Conversation[];
  activeId?: string;
  locale: string;
}) {
  const t = await getTranslations("messaging");

  if (!conversations.length) {
    return (
      <p className="border-t border-line py-6 text-[15px] leading-relaxed text-ink-2">
        {t("noThreads")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        const unread = conversation.unreadCount > 0;

        return (
          <li key={conversation.id}>
            <Link
              href={`/messages?thread=${conversation.id}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1 border-t border-line px-3 py-4 transition-colors duration-150",
                "hover:bg-surface-2",
                active && "bg-surface-2",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-[15px] text-ink",
                    unread ? "font-bold" : "font-semibold",
                  )}
                >
                  {conversation.subject}
                </p>
                <span className="tnum flex-none text-[12px] text-ink-3">
                  {formatStamp(conversation.lastMessageAt, locale)}
                </span>
              </div>

              <p className="truncate text-[13px] text-ink-3">
                {conversation.participantNames.join(" · ")}
              </p>

              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "line-clamp-2 flex-1 text-[13px] leading-relaxed",
                    unread ? "text-ink-2" : "text-ink-3",
                  )}
                >
                  {conversation.lastMessagePreview}
                </p>
                {/* A count, not a bare dot: "3 waiting" and "1 waiting" are
                    different amounts of guilt, and the number is free. */}
                {unread && (
                  <span className="tnum mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-brand text-[11px] font-bold text-on-brand">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
