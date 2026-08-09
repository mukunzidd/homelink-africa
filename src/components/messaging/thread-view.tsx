import { getTranslations } from "next-intl/server";
import type { Conversation, Message, Role } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/domain/dates";
import { dayOf, formatTimeOfDay } from "@/lib/domain/instants";
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

  const lastMine = [...messages].reverse().find((m) => m.authorRole === role);

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
          const mine = message.authorRole === role;
          const newDay = index === 0 || dayOf(message.sentAt) !== dayOf(messages[index - 1].sentAt);

          return (
            <li key={message.id} className="flex flex-col gap-5">
              {newDay && (
                <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
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
                    {mine ? t("you") : message.authorName}
                  </p>
                  <span className="tnum text-[12px] text-ink-3">
                    {formatTimeOfDay(message.sentAt, locale)}
                  </span>
                </div>
                <p className="text-[15px] leading-relaxed text-ink-2">
                  {message.body}
                </p>
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

      {/*
        Inert, and says so. Sending needs a backend, and this milestone has
        none — but leaving the composer out entirely would hide the one part of
        the layout most likely to be wrong, which is how much room a reply box
        takes from the transcript above it.
      */}
      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <label htmlFor="reply" className="sr-only">
          {t("replyLabel")}
        </label>
        <textarea
          id="reply"
          rows={3}
          disabled
          placeholder={t("replyPlaceholder")}
          className={cn(
            "w-full resize-none rounded-ctl border border-line bg-surface-2 px-4 py-3",
            "text-[15px] text-ink placeholder:text-ink-3",
            "disabled:cursor-not-allowed",
          )}
        />
        <p className="text-[13px] text-ink-3">{t("replyNote")}</p>
      </div>
    </div>
  );
}
