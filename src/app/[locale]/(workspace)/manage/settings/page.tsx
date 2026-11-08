import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ExtraKey } from "@/lib/domain/extras";
import { EXTRAS } from "@/lib/domain/extras";
import { NOTIFICATION_CATALOG } from "@/lib/notifications/catalog";
import type { NotificationKind } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { kigaliDay } from "@/lib/domain/instants";
import { routing } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { BankForm, ExtrasForm, NumbersForm, PromosForm } from "@/components/workspace/admin-forms";

/** The numbers the business runs on: refund windows, extras, codes, display rates, the bank, and what each notification says. */
export default async function Settings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("settings");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.admin");
  const s = await repos().admin.settings();
  const kinds = Object.keys(NOTIFICATION_CATALOG) as NotificationKind[];
  const texts = await Promise.all(routing.locales.map(async (l) => ({ l, tn: await getTranslations({ locale: l, namespace: "notifications.kinds" }) })));
  const section = "flex flex-col gap-3 rounded-card border border-line bg-surface-2/40 p-4 sm:p-5";
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("settings")} description={t("settingsBody")} />
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("windows")}</h2>
        <p className="text-[13px] text-ink-3">{t("windowsHint")}</p>
        <NumbersForm kind="windows" fields={(["stay", "car", "experience"] as const).map((k) => ({ key: k, label: t("windowFor", { lane: t(`lanes.${k}`) }), value: s.catalog.windows[k] }))} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("extras")}</h2>
        <ExtrasForm rows={(Object.keys(EXTRAS) as ExtraKey[]).map((k) => ({ key: k, lane: EXTRAS[k].lane, francs: s.catalog.extras[k]?.price.minor ?? EXTRAS[k].price.minor, enabled: s.catalog.extras[k]?.enabled !== false }))} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("promos")}</h2>
        <p className="text-[13px] text-ink-3">{t("promosHint")}</p>
        <PromosForm today={kigaliDay()} rows={Object.entries(s.catalog.promos).map(([code, p]) => ({ code, ...p }))} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("fx")}</h2>
        <p className="text-[13px] text-ink-3">{t("fxHint")}</p>
        <NumbersForm kind="fxDisplay" fields={(["USD", "EUR", "GBP"] as const).map((c) => ({ key: c, label: t("perFranc", { currency: c }), value: Math.round((1 / s.fxDisplay[c]) * 100) / 100, step: 0.01 }))} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("bankTitle")}</h2>
        <BankForm bank={s.bank} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("templates")}</h2>
        <p className="text-[13px] text-ink-3">{t("templatesHint")}</p>
        <div className="flex flex-col gap-2">
          {kinds.map((k) => (
            <details key={k} className="rounded-ctl border border-line bg-surface">
              <summary className="cursor-pointer px-3 py-2 font-mono text-[13px] text-ink">{k}</summary>
              <dl className="grid gap-2 border-t border-line-soft px-3 py-2 text-[13px] sm:grid-cols-2">
                {texts.map(({ l, tn }) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <dt className="font-mono text-[11.5px] uppercase text-ink-3">{l}</dt>
                    <dd className="text-ink">{tn.raw(`${k}.title`) as string}</dd>
                    <dd className="text-ink-2">{tn.raw(`${k}.body`) as string}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
