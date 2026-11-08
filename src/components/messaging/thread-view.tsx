import { getTranslations } from "next-intl/server";
import type { Conversation, Message, Role } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/domain/dates";
import { dayOf, formatTimeOfDay } from "@/lib/domain/instants";
import { readsAs } from "@/lib/preferences/role";
import { PaperclipIcon } from "@/components/ui/icons";
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
                  <p className="text-[15px] leading-relaxed text-ink-2">
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attachment.url}
                          alt={attachment.alt}
                          decoding="async"
                          loading="lazy"
                          className={cn(
                            "w-full rounded-inner border border-line object-cover",
                            message.attachments!.length > 1 ? "h-28" : "h-48",
                          )}
                        />
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

      {/*
        Inert, and the box itself says so. Leaving the composer out would hide
        the one part of the layout most likely to be wrong, which is how much
        room a reply box takes from the transcript above it. The disabled state
        carries the explanation (placeholder, and a title on the send button)
        so no developer note has to sit under it.
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
          aria-describedby="reply-off"
          className={cn(
            "w-full resize-none rounded-ctl border border-line bg-surface-2 px-4 py-3",
            "text-[15px] text-ink placeholder:text-ink-3",
            "disabled:cursor-not-allowed",
          )}
        />
        <span id="reply-off" className="sr-only">
          {t("sendOff")}
        </span>

        {/*
          The attach control is here, and inert like the box above it, because
          leaving it out would hide the two questions it actually raises: how
          much room it takes beside the send action, and what it has to promise.
          Both are answered here rather than discovered when the backend lands.

          It names the limits it will really have, and it repeats the location
          line from the privacy note. Somebody attaching a photograph of their
          front door to a thread is the moment that promise matters most, and
          the note is four screens away by then.
        */}
        {/* Attach and Send share a row and the limits take their own line
            under it: three items in one wrapping row left the limits a 60px
            column between two buttons at 390. */}
        <div className="flex items-center justify-between gap-3">
          <span
            aria-disabled="true"
            title={t("sendOff")}
            className={cn(
              "inline-flex cursor-not-allowed items-center gap-2 rounded-ctl border border-line",
              "bg-surface-2 px-3.5 py-2 text-[13px] font-semibold text-ink-3",
            )}
          >
            <PaperclipIcon size={15} />
            {t("attach")}
          </span>
          <button
            type="button"
            disabled
            title={t("sendOff")}
            className="min-h-9 cursor-not-allowed rounded-ctl bg-surface-2 px-4 py-2 text-[13px] font-semibold text-ink-3"
          >
            {t("send")}
          </button>
        </div>
        <p className="text-[12.5px] text-ink-3">{t("attachLimits")}</p>
      </div>
    </div>
  );
}
