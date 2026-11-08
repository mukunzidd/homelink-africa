import { getTranslations, setRequestLocale } from "next-intl/server";
import { TripPage } from "@/components/cart/trip-page";

export async function generateMetadata() {
  const t = await getTranslations("cart");
  return { title: t("title") };
}

/** The trip cart. Its contents live on the device, so the page renders them in the browser. */
export default async function Trip({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t("title")}</h1>
        <p className="max-w-[66ch] text-[15px] leading-relaxed text-ink-2">{t("intro")}</p>
      </header>
      <TripPage />
    </div>
  );
}
