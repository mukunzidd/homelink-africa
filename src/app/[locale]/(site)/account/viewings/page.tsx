import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { Link } from "@/i18n/navigation";
import { SignedOut } from "@/components/shell/signed-out";
import { StatusPill } from "@/components/ui/status-pill";
import { CancelViewingButton } from "@/components/account/renting-actions";

export async function generateMetadata() {
  const t = await getTranslations("account.viewings");
  return { title: t("title") };
}

const TONE = { requested: "warn", confirmed: "ok", rescheduled: "warn", done: "idle", cancelled: "crit" } as const;

/** Viewings of homes for sale: when, how, where they stand, and a way to move or cancel. */
export default async function Viewings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const t = await getTranslations("account.viewings");
  const intl = INTL_LOCALES[locale as Locale];
  const [viewings, sales] = await Promise.all([repos().viewings.forCurrentUser(), repos().sales.list()]);
  const today = kigaliDay();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
      {viewings.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-2">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {viewings.map((v) => {
            const home = sales.find((s) => s.id === v.saleId);
            const open = v.status !== "cancelled" && v.status !== "done" && v.date >= today;
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-line bg-surface p-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[16px] font-semibold text-ink">{home?.name ?? v.saleId}</span>
                  <span className="tnum text-[14px] text-ink-2">
                    {formatDate(v.date, intl, { weekday: "long", day: "numeric", month: "long" })} · {v.time} · {v.mode === "video" ? t("video") : t("inPerson")}
                  </span>
                </div>
                <StatusPill tone={TONE[v.status]}>{t(`status.${v.status}`)}</StatusPill>
                {open && home && (
                  <div className="flex gap-4">
                    <Link href={`/buy/${home.slug}/viewing`} className="text-[14px] font-semibold text-brand hover:text-brand-deep">
                      {t("move")}
                    </Link>
                    <CancelViewingButton id={v.id} label={t("cancel")} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
