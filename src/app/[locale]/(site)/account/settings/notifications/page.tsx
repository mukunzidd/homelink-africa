import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { PrefsPage } from "@/components/notifications/prefs-page";

export default async function GuestNotificationSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = await currentRole();
  if (role === "visitor") return <SignedOut screen="messages" />;
  const t = await getTranslations("notifications.prefs");
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[18px] font-semibold text-ink">{t("title")}</h2>
      <PrefsPage role={role} />
    </div>
  );
}
