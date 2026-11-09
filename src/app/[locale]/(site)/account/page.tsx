import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { supplyRefFor } from "@/lib/repos/supply-ref";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays, formatDate, formatDateRange, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay, formatAgo } from "@/lib/domain/instants";
import { checkInReleased } from "@/lib/domain/policies";
import { Link } from "@/i18n/navigation";
import { SignedOut } from "@/components/shell/signed-out";
import { SupplyImage } from "@/components/ui/supply-image";
import { StatusPill } from "@/components/ui/status-pill";
import { BanknoteIcon, CalendarIcon, GearIcon, HeartIcon, KeyIcon } from "@/components/ui/icons";

export async function generateMetadata() {
  const t = await getTranslations("header");
  return { title: t("myHomeLink") };
}

/**
 * My HomeLink: the next thing happening, front and centre, with the one
 * action that matters for it (check-in details once they are released),
 * then what has happened lately, then the way to everything else.
 */
export default async function AccountOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = await currentRole();
  if (role === "visitor") return <SignedOut screen="trips" />;
  const [t, tn, tb] = await Promise.all([getTranslations("account"), getTranslations("notifications"), getTranslations("account.nav")]);
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [bookings, notes] = await Promise.all([repos().bookings.listForCurrentUser(), repos().notifications.forRole("guest")]);
  const next = bookings
    .filter((b) => (b.status === "confirmed" || b.status === "active") && b.endDate >= today && b.stayMode !== "lease")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const supply = next ? await supplyRefFor(next) : null;
  const name = next?.guest?.name?.split(" ")[0] ?? bookings.find((b) => b.guest?.name)?.guest?.name?.split(" ")[0] ?? "";
  const days = next ? Math.max(0, nightsBetween(today, next.startDate)) : 0;
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{name ? t("overview.hello", { name }) : tb("overview")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-medium text-ink-3">{t("overview.next")}</h2>
        {next && supply ? (
          <article className="grid overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)] sm:grid-cols-[260px_1fr]">
            <SupplyImage seed={supply.imageSeed} src={supply.image} alt={supply.name} sizes="260px" className="h-44 sm:h-full" />
            <div className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="ok">{next.status === "active" ? t("overview.underway") : t("overview.inDays", { count: days })}</StatusPill>
                {next.service === "stay" &&
                  (checkInReleased(next.startDate, now) ? (
                    <StatusPill tone="ok">{t("overview.checkInReady")}</StatusPill>
                  ) : (
                    <span className="text-[13px] text-ink-3">
                      {t("overview.checkInSoon", { date: formatDate(addDays(next.startDate, -2), intl, { day: "numeric", month: "short" }) })}
                    </span>
                  ))}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-display text-2xl font-semibold leading-tight text-ink">{supply.name}</p>
                <p className="tnum text-[14px] text-ink-2">
                  {next.startDate === next.endDate ? formatDate(next.startDate, intl) : formatDateRange(next.startDate, next.endDate, intl)} · {supply.detail}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Link href={`/bookings/${next.reference}`} className="inline-flex min-h-11 items-center gap-2 rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
                  <KeyIcon size={15} />
                  {t("overview.viewBooking")}
                </Link>
                <Link href="/messages" className="inline-flex min-h-11 items-center rounded-ctl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:border-brand hover:text-brand">
                  {t("overview.message")}
                </Link>
              </div>
            </div>
          </article>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-surface p-6">
            <p className="text-[15px] text-ink-2">{t("overview.nothing")}</p>
            <Link href="/stays" className="inline-flex min-h-11 items-center rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand">
              {t("overview.find")}
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium text-ink-3">{t("overview.latest")}</h2>
            <Link href="/notifications" className="text-[13px] font-semibold text-brand hover:text-brand-deep">
              {t("overview.seeAll")}
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
            {notes.slice(0, 4).map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
                  <span aria-hidden="true" className={n.readAt ? "mt-2 size-2 flex-none rounded-full bg-transparent" : "mt-2 size-2 flex-none rounded-full bg-brand"} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14px] font-medium text-ink">{tn(`kinds.${n.kind}.title`, n.params)}</span>
                    <span className="truncate text-[13px] text-ink-2">{tn(`kinds.${n.kind}.body`, n.params)}</span>
                  </span>
                  <span className="tnum flex-none text-[12px] text-ink-3">{formatAgo(n.createdAt, now, intl)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label={t("overview.shortcuts")} className="flex flex-col gap-3">
          <h2 className="text-[13px] font-medium text-ink-3">{t("overview.shortcuts")}</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {(
              [
                ["/trips", CalendarIcon, tb("trips")],
                ["/account/payments", BanknoteIcon, tb("payments")],
                ["/saved", HeartIcon, tb("saved")],
                ["/account/settings", GearIcon, tb("settings")],
              ] as const
            ).map(([href, Icon, label]) => (
              <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand hover:text-brand">
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
