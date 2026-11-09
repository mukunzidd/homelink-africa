import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireSection } from "@/lib/workspace/guard";
import { SectionHeader } from "@/components/workspace/section-header";
import { NotificationsPage } from "@/components/notifications/notifications-page";

export default async function WorkspaceNotifications({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; unread?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("notifications");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("notifications");

  return (
    <NotificationsPage
      role={access.role}
      base="/manage/notifications"
      searchParams={await searchParams}
      heading={(actions) => <SectionHeader title={t("title")} actions={actions} />}
    />
  );
}
