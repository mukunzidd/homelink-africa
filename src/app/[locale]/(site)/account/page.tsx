import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { SignedOut } from "@/components/shell/signed-out";

/** My HomeLink. The overview itself arrives with Task 30. */
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role === "visitor") return <SignedOut screen="trips" />;
  const t = await getTranslations("header");
  return <h1 className="font-display text-3xl font-semibold text-ink">{t("myHomeLink")}</h1>;
}
