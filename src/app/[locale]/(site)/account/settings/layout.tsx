import { getTranslations } from "next-intl/server";
import { SettingsNav } from "@/components/account/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("account.settings");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
