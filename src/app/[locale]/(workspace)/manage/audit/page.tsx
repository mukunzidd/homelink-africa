import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Role } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatStamp } from "@/lib/domain/instants";
import { isIsoDate } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { ExportCsv } from "@/components/workspace/admin-forms";

const ACTORS: Role[] = ["admin", "ops", "driver", "guide", "guest"];

/** Where an audited target lives in the workspace, when it has a page. */
function hrefFor(target: string, slugs: Map<string, string>): string | null {
  if (/^HL-/.test(target)) return `/manage/bookings/${target}`;
  if (target.startsWith("bkg_")) return null;
  if (target.startsWith("lst_")) return slugs.has(target) ? `/manage/portfolio/${slugs.get(target)}` : null;
  if (target.startsWith("tkt_")) return `/manage/maintenance?ticket=${target}`;
  if (target.startsWith("inc_")) return `/manage/incidents?show=all`;
  if (target.startsWith("ptn_")) return `/manage/partners/${target}`;
  if (target.startsWith("stf_")) return `/manage/people`;
  return null;
}

/** Every recorded action, newest first, with who, what, on what, and when in Kigali. Filters are in the URL; the export is the rows shown. */
export default async function Audit({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ actor?: string; action?: string; from?: string; to?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("audit");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const t = await getTranslations("workspace.admin");
  const intl = INTL_LOCALES[locale as Locale];
  const actor = ACTORS.find((a) => a === sp.actor);
  const [entries, homes] = await Promise.all([
    repos().audit.list({ ...(actor ? { actor } : {}), ...(isIsoDate(sp.from) ? { from: sp.from } : {}), ...(isIsoDate(sp.to) ? { to: `${sp.to}T23:59:59.999Z` } : {}) }),
    repos().stays.all(),
  ]);
  const q = (sp.action ?? "").trim().toLowerCase().slice(0, 40);
  const rows = entries.filter((e) => !q || e.action.toLowerCase().includes(q)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  const slugs = new Map(homes.map((h) => [h.id, h.slug]));
  const field = "min-h-10 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink";
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("audit")} description={t("auditBody")} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("who")}<select name="actor" defaultValue={actor ?? ""} className={field}><option value="">{t("anyone")}</option>{ACTORS.map((a) => <option key={a} value={a}>{t(`actors.${a}`)}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("what")}<input name="action" defaultValue={sp.action ?? ""} placeholder="booking.cancel" className={`${field} w-44 font-mono`} /></label>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("from")}<input type="date" name="from" defaultValue={sp.from ?? ""} className={field} /></label>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("until")}<input type="date" name="to" defaultValue={sp.to ?? ""} className={field} /></label>
          <button type="submit" className="min-h-10 cursor-pointer rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand">{t("filter")}</button>
        </form>
        <ExportCsv name="homelink-audit.csv" rows={[["when", "who", "what", "target", "detail"], ...rows.map((e) => [e.at, e.actor, e.action, e.target, e.detail ?? ""])]} />
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead className="border-b border-line bg-surface-2/60 text-left text-[12.5px] text-ink-3">
            <tr><th className="px-4 py-2.5 font-medium">{t("when")}</th><th className="px-4 py-2.5 font-medium">{t("who")}</th><th className="px-4 py-2.5 font-medium">{t("what")}</th><th className="px-4 py-2.5 font-medium">{t("target")}</th><th className="px-4 py-2.5 font-medium">{t("detail")}</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const href = hrefFor(e.target, slugs);
              return (
                <tr key={e.id} className="border-t border-line-soft">
                  <td className="whitespace-nowrap px-4 py-2 text-ink-2">{formatStamp(e.at, intl)}</td>
                  <td className="px-4 py-2 text-ink-2">{t(`actors.${e.actor}`)}</td>
                  <td className="px-4 py-2 font-mono text-[13px] text-ink">{e.action}</td>
                  <td className="px-4 py-2">{href ? <Link href={href} className="font-mono text-[13px] font-semibold text-brand hover:underline">{e.target}</Link> : <span className="font-mono text-[13px] text-ink-2">{e.target}</span>}</td>
                  <td className="max-w-[40ch] truncate px-4 py-2 text-[13px] text-ink-3" title={e.detail}>{e.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-[14px] text-ink-3">{t("noEntries")}</p>}
      </div>
    </div>
  );
}
