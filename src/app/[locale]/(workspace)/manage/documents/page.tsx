import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { partnerFor } from "@/lib/workspace/partner";
import { expiryState } from "@/lib/workspace/expiry";
import { formatDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { ReplaceDocument } from "@/components/workspace/partner-forms";

const TONE = { valid: "ok", expiringSoon: "warn", expired: "crit" } as const;

/** The papers that let them work, soonest to run out first, each replaceable with a newer copy. */
export default async function Documents({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("documents");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.partner");
  const intl = INTL_LOCALES[locale as Locale];
  const me = partnerFor(access.role);
  const docs = me ? await repos().partners.documents(me) : [];
  const today = kigaliDay();
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("documents")} description={t("documentsBody")} />
      <ul className="flex flex-col gap-3">
        {docs.map((d) => {
          const state = expiryState(d.expires, today);
          return (
            <li key={d.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] font-semibold text-ink">{t(`doc.${d.kind}`)}</span>
                <span className="text-[13px] text-ink-3">{t("until", { date: formatDate(d.expires, intl, { day: "numeric", month: "long", year: "numeric" }) })}{d.fileName ? ` · ${d.fileName}` : ""}</span>
              </span>
              <span className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                <StatusPill tone={TONE[state]}>{state === "expiringSoon" ? t("daysLeft", { count: nightsBetween(today, d.expires) }) : t(`expiry.${state}`)}</StatusPill>
                <ReplaceDocument id={d.id} today={today} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
