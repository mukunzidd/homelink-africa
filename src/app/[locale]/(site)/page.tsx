import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/landing/landing";

/**
 * The home page. Its hero is "split" (Kigali in daylight beside the
 * inspection slip); the others can be compared at /preview/landing.
 */
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing locale={locale} hero="split" />;
}
