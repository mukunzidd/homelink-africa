import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireSection } from "@/lib/workspace/guard";
import { SectionHeader } from "@/components/workspace/section-header";
import { PrefsPage } from "@/components/notifications/prefs-page";

export default async function WorkspaceNotificationSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("notifications");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("notifications.prefs");
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("title")} />
      <PrefsPage role={access.role} />
    </div>
  );
}
