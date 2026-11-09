import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TripCheckout } from "@/components/cart/trip-checkout";

export async function generateMetadata() {
  const t = await getTranslations("cart");
  return { title: t("checkoutTitle") };
}

export default async function TripCheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs trail={[{ label: t("title"), href: "/trip" }, { label: t("checkoutTitle") }]} />
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t("checkoutTitle")}</h1>
      <TripCheckout />
    </div>
  );
}
