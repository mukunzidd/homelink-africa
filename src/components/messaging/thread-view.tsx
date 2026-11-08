import { getTranslations } from "next-intl/server";
import type { Conversation, Message, Role } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/domain/dates";
import { dayOf, formatTimeOfDay } from "@/lib/domain/instants";
import { readsAs } from "@/lib/preferences/role";
import { Composer } from "./composer";
import { cn } from "@/lib/cn";

/**
 * One thread, read from whichever side you are on.
 *
 * "Mine" is decided by role rather than by a name, which is what makes the
 * same fixture thread legible from both ends: switch from guest to driver in
 * the preview bar and the alignment flips, because the person you are changed
 * and the messages did not.
 *
 * No bubbles-with-tails and no chat-app furniture. This is a record of what
 * was agreed about a booking, and people read it back weeks later to settle
 * exactly that — so it is laid out as a transcript with the day called out,
 * not as a stream.
 *
 * Photographs are first-class here rather than links in the text. On a product
 * whose whole claim is that somebody went and looked, the picture *is* the
 * argument: the tank is full, the car is in bay 12, this is the crack that was
 * already there. A message may be nothing but a photograph, which is why the
 * body is rendered conditionally — a layout that assumes text is always there
 * puts an empty line above every picture.
 */
export async function ThreadView({
  conversation,
  messages,
  role,
  locale,
  /** Where this thread hangs: a booking reference or a trip name, plus a link. */
  scope,
}: {
  conversation: Conversation;
  messages: Message[];
  role: Role;
  locale: string;
  scope?: { label: string; href: string } | null;
}) {
  const t = await getTranslations("messaging");

  // Admin reads from the ops side (see `readsAs`), so ops messages align
  // right. They are still labelled with the author's name rather than "You":
  // the admin did not write them.
  const side = readsAs(role);
  const isMe = side === role;
  const lastMine = [...messages].reverse().find((m) => m.authorRole === side);

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-2 border-b border-line pb-5">
        <h2 className="font-display text-2xl font-semibold leading-tight text-ink">
          {conversation.subject}
        </h2>
        <p className="text-[13px] text-ink-2">
          {conversation.participantNames.join(" · ")}
        </p>
        {scope && (
          <Link
            href={scope.href}
            className="self-start rounded-ctl text-[13px] font-semibold text-brand hover:text-brand-deep"
          >
            {scope.label}
          </Link>
        )}
      </header>

      <ol className="flex flex-col gap-5 py-6">
        {messages.map((message, index) => {
          const mine = message.authorRole === side;
          const newDay = index === 0 || dayOf(message.sentAt) !== dayOf(messages[index - 1].sentAt);

          return (
            <li key={message.id} className="flex flex-col gap-5">
              {newDay && (
                <p className="flex items-center gap-3 text-[12px] font-medium text-ink-3">
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  {formatDate(dayOf(message.sentAt), locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                </p>
              )}

              <div
                className={cn(
                  "flex max-w-[46ch] flex-col gap-1 rounded-card px-4 py-3",
                  mine
                    ? "self-end bg-brand-tint"
                    : "self-start border border-line bg-surface",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-semibold text-ink">
                    {mine && isMe ? t("you") : message.authorName}
                  </p>
                  <span className="tnum text-[12px] text-ink-3">
                    {formatTimeOfDay(message.sentAt, locale)}
                  </span>
                </div>
                {message.body && (
                  <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">
                    {message.body}
                  </p>
                )}

                {message.attachments && message.attachments.length > 0 && (
                  <ul
                    className={cn(
                      "mt-1 grid gap-1.5",
                      message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        {/* Plain <img>: in Phase 2 these are short-lived signed
                            URLs from private storage, which the image optimizer
                            can neither cache nor allowlist. Deciding that now
                            costs nothing and saves a swap later. */}
                        <a href={attachment.url} target="_blank" rel="noopener" aria-label={t("openPhoto")} className="block rounded-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attachment.url}
                          alt={attachment.alt || t("photoFrom", { name: message.authorName })}
                          decoding="async"
                          loading="lazy"
                          className={cn(
                            "w-full rounded-inner border border-line object-cover",
                            message.attachments!.length > 1 ? "h-28" : "h-48",
                          )}
                        />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Read state on the last message you sent, and only there. On
                  every message it becomes wallpaper; on the last one it answers
                  the question people actually have. */}
              {mine && message.id === lastMine?.id && (
                <p className="-mt-3 self-end text-[12px] text-ink-3">
                  {message.readAt
                    ? t("readAt", { time: formatTimeOfDay(message.readAt, locale) })
                    : t("delivered")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div id="thread-end" aria-hidden="true" />
      <Composer key={conversation.id} conversationId={conversation.id} />
    </div>
  );
}
