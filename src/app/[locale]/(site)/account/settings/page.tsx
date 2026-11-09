import { setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { SignedOut } from "@/components/shell/signed-out";
import { ProfileForm } from "@/components/account/settings-forms";

/** Who you are to us: name, contact, photo, and someone to call in an emergency. */
export default async function ProfileSettings({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  return <ProfileForm profile={await repos().account.profile()} />;
}
