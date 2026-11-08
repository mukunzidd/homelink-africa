import { getTranslations } from "next-intl/server";
import { canAccess, type WorkspaceSection } from "@/lib/workspace/nav";
import { currentRole } from "@/lib/workspace/guard";
import { SectionHeader } from "@/components/workspace/section-header";
import { NotForYou } from "@/components/workspace/not-for-you";
import { notFound } from "next/navigation";

/**
 * A workspace section that is in the map but not built yet.
 *
 * The shell lands before its pages, and every sidebar link has to go
 * somewhere honest in the meantime: the section's name and a plain "not
 * built yet", with the same access check a real page makes. A path that is
 * not a section at all is a 404.
 */
export default async function NotBuiltSection({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  const section = rest[0] as WorkspaceSection;
  const t = await getTranslations("workspace");
  const role = await currentRole();
  if (!t.has(`sections.${section}`)) notFound();
  if (!canAccess(role, section)) return <NotForYou kind="section" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t(`sections.${section}`)} />
      <div className="rounded-card border border-dashed border-line bg-surface p-8">
        <p className="text-[15px] font-semibold text-ink">{t("comingTitle")}</p>
        <p className="mt-1 max-w-[60ch] text-[14px] text-ink-2">{t("comingBody")}</p>
      </div>
    </div>
  );
}
