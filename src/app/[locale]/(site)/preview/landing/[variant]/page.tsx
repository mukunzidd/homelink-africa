import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/landing/landing";
import { HERO_VARIANTS, type HeroVariant } from "@/components/landing/heroes";
import { DESIGNS, DESIGN_KEYS } from "@/components/landing/designs";
import { loadLandingData } from "@/components/landing/data";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return [...HERO_VARIANTS, ...DESIGN_KEYS].map((variant) => ({ variant }));
}

/** The home page as one of the candidates: a hero on today's page, or a whole-page design. */
export default async function LandingVariant({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { locale, variant } = await params;
  setRequestLocale(locale);
  const Design = DESIGNS[variant];
  if (Design) return <Design locale={locale} data={await loadLandingData(locale)} />;
  if (!HERO_VARIANTS.includes(variant as HeroVariant)) notFound();
  return <Landing locale={locale} hero={variant as HeroVariant} />;
}
