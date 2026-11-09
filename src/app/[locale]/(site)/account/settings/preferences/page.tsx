import { setRequestLocale } from "next-intl/server";
import { PreferencesForm } from "@/components/account/settings-forms";

/** The same language, currency and theme controls as the header, kept with the rest of the settings. */
export default async function Preferences({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <PreferencesForm />;
}
