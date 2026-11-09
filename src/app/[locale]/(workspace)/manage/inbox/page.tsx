import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { supplyLaneFor } from "@/lib/preferences/role";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { ThreadList } from "@/components/messaging/thread-list";
import { ThreadView } from "@/components/messaging/thread-view";
import { cn } from "@/lib/cn";

/**
 * The same threads as /messages, inside the workspace. Two panes from
 * 1024px, one below (the list, or the open thread with a way back). The
 * repo decides what each role sees: ops and admin every thread they are in,
 * a driver or a guide only their own jobs' threads.
 */
export default async function Inbox({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ thread?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("inbox");
  if ("deny" in access) return access.deny;
  const { role } = access;
  const { thread } = await searchParams;
  const [t, tw] = await Promise.all([getTranslations("messaging"), getTranslations("workspace.queue")]);
  const intl = INTL_LOCALES[locale as Locale];

  const conversations = await repos().messaging.forRole(role);
  const active = conversations.find((c) => c.id === thread) ?? conversations[0] ?? null;
  const messages = active ? await repos().messaging.messages(active.id) : [];

  const bookings = await repos().bookings.listAll();
  const tagOf = async (c: (typeof conversations)[number]) => {
    if (c.scope.kind === "trip") return (await repos().trips.byId(c.scope.id))?.name ?? null;
    return bookings.find((b) => b.id === c.scope.id)?.reference ?? null;
  };
  const scopeTags = Object.fromEntries(await Promise.all(conversations.map(async (c) => [c.id, await tagOf(c)] as const)));
  const activeBooking = active?.scope.kind === "booking" ? bookings.find((b) => b.id === active.scope.id) : undefined;
  const staff = !supplyLaneFor(role);
  const scope = activeBooking
    ? { label: t("aboutBooking", { reference: activeBooking.reference }), href: staff ? `/manage/bookings/${activeBooking.reference}` : "/manage/jobs" }
    : null;
  const selected = !!thread && active?.id === thread;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={tw("inbox.title")} description={t(`subtitleFor.${staff ? "ops" : "supply"}`)} />
      <div className="grid grid-cols-1 items-start gap-x-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className={cn("min-w-0 flex-col lg:flex", thread ? "hidden" : "flex")}>
          <ThreadList conversations={conversations} activeId={active?.id} selected={selected} role={role} scopeTags={scopeTags} locale={intl} basePath="/manage/inbox" />
        </div>
        <div className={cn("min-w-0 flex-col lg:flex", thread ? "flex" : "hidden")}>
          {active ? (
            <>
              <Link href="/manage/inbox" className="mb-4 self-start text-sm font-semibold text-brand hover:text-brand-deep lg:hidden">
                ← {t("allThreads")}
              </Link>
              <ThreadView conversation={active} messages={messages} role={role} locale={intl} scope={scope} />
            </>
          ) : (
            <p className="py-6 text-[15px] text-ink-2">{t("noThreads")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
