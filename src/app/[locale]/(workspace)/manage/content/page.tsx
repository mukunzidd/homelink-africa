import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { kigaliDay } from "@/lib/domain/instants";
import { SectionHeader } from "@/components/workspace/section-header";
import { AnnouncementsEditor, FeaturedEditor, NeighbourhoodsEditor } from "@/components/workspace/admin-forms";

/** What the public site says without a deploy: a line across the top, the homes the landing page leads with, and a line per neighbourhood. */
export default async function Content({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("content");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.admin");
  const [content, homes, names] = await Promise.all([repos().admin.content(), repos().stays.list(), repos().stays.neighbourhoods()]);
  const section = "flex flex-col gap-3 rounded-card border border-line bg-surface-2/40 p-4 sm:p-5";
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("content")} description={t("contentBody")} />
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("announcements")}</h2>
        <p className="text-[13px] text-ink-3">{t("announcementsHint")}</p>
        <AnnouncementsEditor initial={content.announcements} today={kigaliDay()} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("featured")}</h2>
        <FeaturedEditor homes={homes.map((h) => ({ id: h.id, name: h.name }))} initial={content.featured} />
      </section>
      <section className={section}>
        <h2 className="text-[16px] font-semibold text-ink">{t("neighbourhoods")}</h2>
        <p className="text-[13px] text-ink-3">{t("neighbourhoodsHint")}</p>
        <NeighbourhoodsEditor names={names} initial={content.neighbourhoods} />
      </section>
    </div>
  );
}
