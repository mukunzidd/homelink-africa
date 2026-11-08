import { getTranslations, setRequestLocale } from "next-intl/server";
import type { JobOffer } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { partnerFor } from "@/lib/workspace/partner";
import { formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Countdown, OfferActions } from "@/components/workspace/partner-forms";
import { cn } from "@/lib/cn";

/**
 * A driver's or guide's work: offers to answer first, each with where, when,
 * how many, what it pays and how long is left to say yes; then what they
 * have taken on; then what is done.
 */
export default async function Jobs({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("jobs");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.partner");
  const intl = INTL_LOCALES[locale as Locale];
  const me = partnerFor(access.role);
  const all = me ? await repos().partners.offers(me) : [];
  const today = kigaliDay();
  const now = Date.now();
  const offers = all.filter((j) => j.status === "offered" && (!j.offerExpiresAt || Date.parse(j.offerExpiresAt) > now));
  const upcoming = all.filter((j) => j.status === "accepted" && j.end >= today);
  const done = all.filter((j) => j.status === "done" || (j.status === "accepted" && j.end < today)).reverse();
  const day = (d: string) => formatDate(d, intl, { weekday: "long", day: "numeric", month: "long" });

  const card = (j: JobOffer, action?: React.ReactNode) => (
    <li key={j.id} className={cn("flex flex-col gap-3 rounded-card border bg-surface p-4", j.status === "offered" ? "border-warn/50" : "border-line")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={j.status === "offered" ? "warn" : j.status === "accepted" ? "ok" : "idle"}>{t(`state.${j.status}`)}</StatusPill>
            <span className="text-[12.5px] text-ink-3">{t(`kind.${j.kind}`)}</span>
          </span>
          <span className="text-[16px] font-semibold text-ink">{day(j.start)} · {j.time}</span>
          <span className="text-[14px] text-ink-2">{j.pickup}</span>
          <span className="text-[13px] text-ink-3">{t("people", { count: j.party })}</span>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <span className="tnum text-[18px] font-semibold text-ink">{formatMoney(j.pay, intl)}</span>
          {j.status === "offered" && j.offerExpiresAt && <Countdown until={j.offerExpiresAt} />}
        </div>
      </div>
      {action}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("jobs")} description={t("jobsBody")} />
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{t("offers")} <span className="font-normal text-ink-3">· {offers.length}</span></h2>
        {offers.length ? <ul className="flex flex-col gap-3">{offers.map((j) => card(j, <OfferActions id={j.id} />))}</ul> : <p className="text-[14px] text-ink-3">{t("noOffers")}</p>}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{t("upcoming")} <span className="font-normal text-ink-3">· {upcoming.length}</span></h2>
        {upcoming.length ? <ul className="flex flex-col gap-3">{upcoming.map((j) => card(j))}</ul> : <p className="text-[14px] text-ink-3">{t("noUpcoming")}</p>}
      </section>
      {done.length > 0 && (
        <section className="flex flex-col gap-3 opacity-80">
          <h2 className="text-[15px] font-semibold text-ink">{t("done")}</h2>
          <ul className="flex flex-col gap-3">{done.map((j) => card(j))}</ul>
        </section>
      )}
    </div>
  );
}
