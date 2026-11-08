import { getTranslations } from "next-intl/server";
import type { Conversation, Role } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { formatStamp } from "@/lib/domain/instants";
import { readsAs } from "@/lib/preferences/role";
import { cn } from "@/lib/cn";

/**
 * Every thread this person is in.
 *
 * Selection lives in the URL rather than in component state, so a thread can
 * be linked to from a booking row, opened in a new tab, and reached by the
 * back button. It also keeps the whole screen a server component: there is
 * nothing here a client render would do better.
 *
 * Each row names the other side of the thread rather than everyone in it. The
 * reader knows who they are; what they need from a list is who is waiting on
 * them and about which booking.
 */
export async function ThreadList({
  conversations,
  activeId,
  selected,
  role,
  scopeTags,
  locale,
}: {
  conversations: Conversation[];
  /** The thread shown beside the list on a desktop. */
  activeId?: string;
  /** True only when the URL names that thread. Without it a phone shows the
   *  list alone, so nothing there may look open. */
  selected: boolean;
  role: Role;
  /** Booking reference or trip name per thread id. */
  scopeTags: Record<string, string | null>;
  locale: string;
}) {
  const t = await getTranslations("messaging");
  const tRoles = await getTranslations("roles");
  const reader = readsAs(role);

  const otherSide = (c: Conversation) =>
    c.participantRoles
      .map((r, i) => ({ role: r, name: c.participantNames[i] }))
      .filter((p) => p.role !== reader && p.name)
      .map((p) => t("party", { name: p.name, role: tRoles(p.role) }))
      .join(", ");

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
        // The open thread has been read by the act of opening it, so its count
        // goes. When the open thread is only the desktop default, the count
        // still shows on a phone, where the thread is not on screen.
        const unread = conversation.unreadCount > 0;
        const tag = scopeTags[conversation.id];

        return (
          <li key={conversation.id}>
            <Link
              href={`/messages?thread=${conversation.id}`}
              aria-current={active && selected ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1 border-t border-line px-3 py-4 transition-colors duration-150",
                "hover:bg-surface-2",
                active && (selected ? "bg-surface-2" : "lg:bg-surface-2"),
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                  {conversation.subject}
                </p>
                <span className="tnum flex-none text-[12px] text-ink-3">
                  {formatStamp(conversation.lastMessageAt, locale)}
                </span>
              </div>

              <p className="flex min-w-0 items-baseline gap-2 text-[13px] text-ink-3">
                <span className="min-w-0 truncate text-ink-2">{otherSide(conversation)}</span>
                {tag && (
                  <span
                    className={cn(
                      "flex-none text-[12px] text-ink-3",
                      conversation.scope.kind === "booking" && "font-mono",
                    )}
                  >
                    {tag}
                  </span>
                )}
              </p>

              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "line-clamp-2 flex-1 text-[13px] leading-relaxed",
                    unread && !(active && selected) ? "text-ink-2" : "text-ink-3",
                  )}
                >
                  {conversation.lastMessagePreview}
                </p>
                {/* A count, not a bare dot: "3 waiting" and "1 waiting" are
                    different amounts of guilt, and the number is free. */}
                {unread && !(active && selected) && (
                  <span
                    className={cn(
                      "tnum mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand",
                      active && "lg:hidden",
                    )}
                  >
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
