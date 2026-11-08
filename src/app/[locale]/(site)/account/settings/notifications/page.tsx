import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { Link } from "@/i18n/navigation";
import { PrefsPage } from "@/components/notifications/prefs-page";

export default async function GuestNotificationSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = await currentRole();
  if (role === "visitor") return <SignedOut screen="messages" />;
  const t = await getTranslations("notifications.prefs");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/notifications" className="self-start rounded-ctl text-[14px] font-semibold text-brand hover:text-brand-deep">
        ← {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
      <PrefsPage role={role} />
    </div>
  );
}
