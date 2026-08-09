import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { ThreadList } from "@/components/messaging/thread-list";
import { ThreadView } from "@/components/messaging/thread-view";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging");
  return { title: t("title") };
}

/**
 * Threads, scoped to what they are about.
 *
 * Product & UX §8 calls messaging load-bearing rather than an add-on, and the
 * reason is visible in the fixtures: the guest's counterparty is HomeLink, not
 * the owner of the flat. The concierge carries the message across, which means
 * one booking can have two threads that must never see each other. Which one
 * you get is decided by role, on the server.
 *
 * Selection is a query parameter, so a booking row can link straight at a
 * thread and the back button behaves. On a phone the list and the transcript
 * are alternatives rather than columns — 390px will not hold both, and a
 * 140px-wide thread list is worse than a second tap.
 */
export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("messaging");
  const intlLocale = INTL_LOCALES[locale as Locale];
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  const { thread } = await searchParams;

  const conversations = await repos().messaging.forRole(role);

  // An unknown or unreadable id falls back to the newest thread rather than to
  // an error: a link that has gone stale should land somewhere useful, and the
  // repo has already refused anything this role is not in.
  const active =
    conversations.find((c) => c.id === thread) ?? conversations[0] ?? null;

  const messages = active ? await repos().messaging.messages(active.id) : [];
  const scope = active ? await scopeFor(active.scope) : null;

  async function scopeFor(ref: { kind: "booking" | "trip"; id: string }) {
    if (ref.kind === "trip") {
      const trip = await repos().trips.byId(ref.id);
      return trip ? { label: trip.name, href: "/trips" } : null;
    }
    const booking = await repos().bookings.byId(ref.id);
    return booking
      ? { label: t("aboutBooking", { reference: booking.reference }), href: "/trips" }
      : null;
  }

  const showListOnMobile = !thread;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid items-start gap-x-10 lg:grid-cols-[320px_1fr]">
        <div
          className={cn(
            "flex-col lg:flex",
            showListOnMobile ? "flex" : "hidden",
          )}
        >
          <ThreadList
            conversations={conversations}
            activeId={active?.id}
            locale={intlLocale}
          />
        </div>

        <div
          className={cn(
            "flex-col lg:flex",
            showListOnMobile ? "hidden" : "flex",
          )}
        >
          {active ? (
            <>
              <Link
                href="/messages"
                className="mb-4 self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep lg:hidden"
              >
                ← {t("allThreads")}
              </Link>
              <ThreadView
                conversation={active}
                messages={messages}
                role={role}
                locale={intlLocale}
                scope={scope}
              />
            </>
          ) : (
            <p className="py-6 text-[15px] leading-relaxed text-ink-2">
              {t("noThreads")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
