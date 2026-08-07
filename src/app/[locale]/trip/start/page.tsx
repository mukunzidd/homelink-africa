import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotBuiltYet } from "@/components/shell/not-built-yet";

export default async function TripStartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doors");

  return <NotBuiltYet title={t("arriving.title")} />;
}
