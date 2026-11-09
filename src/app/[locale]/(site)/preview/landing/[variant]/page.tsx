import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/landing/landing";
import { HERO_VARIANTS, type HeroVariant } from "@/components/landing/heroes";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return HERO_VARIANTS.map((variant) => ({ variant }));
}

/** The home page with one of the candidate heroes, for comparing them on the real page. */
export default async function LandingVariant({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { locale, variant } = await params;
  setRequestLocale(locale);
  if (!HERO_VARIANTS.includes(variant as HeroVariant)) notFound();
  return <Landing locale={locale} hero={variant as HeroVariant} />;
}
