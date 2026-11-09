import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HERO_VARIANTS } from "@/components/landing/heroes";
import { HeroCompare } from "@/components/landing/hero-compare";
import { DESIGN_KEYS } from "@/components/landing/designs";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Every candidate landing page side by side, each a live frame of the real
 * page, at a desktop or a phone size. Picking one is a one-word change in
 * the home route; this page is how to choose.
 */
export default async function LandingOptions({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("heroPreview");
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-ink">{t("title")}</h1>
        <p className="max-w-[64ch] text-[15px] leading-relaxed text-ink-2">{t("body")}</p>
      </header>
      <HeroCompare
        locale={locale}
        current="split"
        groups={[
          { title: t("groupDesigns"), options: DESIGN_KEYS.map((v) => ({ key: v, name: t(`variants.${v}.name`), body: t(`variants.${v}.body`) })) },
          { title: t("groupHeroes"), options: HERO_VARIANTS.map((v) => ({ key: v, name: t(`variants.${v}.name`), body: t(`variants.${v}.body`) })) },
        ]}
        labels={{ desktop: t("desktop"), phone: t("phone"), open: t("open"), current: t("current") }}
      />
    </div>
  );
}
