import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentRole } from "@/lib/workspace/guard";
import { homeFor } from "@/lib/workspace/nav";
import { redirect } from "next/navigation";
import { AccountFrame } from "@/components/account/account-frame";
import { SignedOut } from "@/components/shell/signed-out";
import { NotificationsPage } from "@/components/notifications/notifications-page";

export async function generateMetadata() {
  const t = await getTranslations("notifications");
  return { title: t("title") };
}

export default async function GuestNotifications({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; unread?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = await currentRole();
  if (role === "visitor") return <SignedOut screen="messages" />;
  // Staff and partners read theirs inside the workspace.
  if (homeFor(role)) redirect(`/${locale}/manage/notifications`);
  const t = await getTranslations("notifications");

  return (
    <AccountFrame>
      <NotificationsPage
        role={role}
        base="/notifications"
        searchParams={await searchParams}
        heading={(actions) => (
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
            {actions}
          </header>
        )}
      />
    </AccountFrame>
  );
}
