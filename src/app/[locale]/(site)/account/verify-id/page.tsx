import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { IdCheckForm } from "@/components/account/settings-forms";
import { SettingsNav } from "@/components/account/settings-nav";

/** A photo of an ID and a selfie, once, so renting and some hires do not ask again. */
export default async function VerifyId({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const [t, ts] = await Promise.all([getTranslations("account.id"), getTranslations("account.settings")]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold text-ink">{ts("title")}</h1>
      <SettingsNav />
      <p className="max-w-[62ch] text-[15px] text-ink-2">{t("intro")}</p>
      <IdCheckForm check={await repos().account.idCheck()} />
    </div>
  );
}
