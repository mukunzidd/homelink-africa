import { setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { formatAgo } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { PasswordForm, Sessions, TwoStep } from "@/components/account/settings-forms";

/** The password, where you are signed in, and a second step at sign-in. */
export default async function Security({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const [profile, sessions] = await Promise.all([repos().account.profile(), repos().account.sessions()]);
  const now = new Date();
  const labels = Object.fromEntries(sessions.map((s) => [s.id, formatAgo(s.lastActiveAt, now, INTL_LOCALES[locale as Locale])]));
  return (
    <div className="flex flex-col gap-5">
      <PasswordForm />
      <Sessions sessions={sessions} labels={labels} />
      <TwoStep on={profile.twoStep} />
    </div>
  );
}
