import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { initials } from "@/components/results/inspected-by";
import { HeroSearch } from "@/components/search/hero-search";
import { ArrowRightIcon, CheckIcon, ShieldIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The landing page's first screen, in each of the versions the owner is
 * choosing between. They share the words, the search and the inspection
 * slip, and differ in composition and photograph:
 *
 * - split: Kigali's hillside homes in daylight beside the words, with the
 *   slip over the photo's edge. The current home page.
 * - golden: the skyline at sunset across the whole hero, the hour most
 *   flights land, with the words on the open sky.
 * - street: a dusk street behind a dark scrim, words left, card right.
 *   The version before the unslop pass.
 * - original: words centred over the hillside under a dark wash, with a
 *   badge above. The version the UI milestone shipped.
 */
export const HERO_VARIANTS = ["split", "golden", "street", "original"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export type HeroData = {
  count: number;
  latest?: Listing;
  record?: Listing["verification"];
  inspectedOn: string;
  checks: { key: string }[];
};

export async function Hero({ variant, data }: { variant: HeroVariant; data: HeroData }) {
  if (variant === "golden") return <GoldenHero data={data} />;
  if (variant === "street") return <StreetHero data={data} />;
  if (variant === "original") return <OriginalHero data={data} />;
  return <SplitHero data={data} />;
}

/** The newest real inspection, with the inspector's initials as a stamp: the headline's proof. */
async function InspectionSlip({ data, className }: { data: HeroData; className?: string }) {
  const tVerify = await getTranslations("verification");
  const { latest, record } = data;
  if (!latest || !record) return null;
  return (
    <Link
      href={`/stays/${latest.slug}`}
      className={cn(
        "group flex flex-col gap-4 rounded-[12px] border border-line bg-surface p-5 text-ink shadow-[0_16px_40px_-20px_rgba(20,24,20,0.45)] transition-colors duration-150 hover:border-brand/40",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 flex-none -rotate-6 place-items-center rounded-full border-[1.5px] border-trust text-[13px] font-semibold tracking-wide text-trust">
          {initials(record.inspectorName)}
        </span>
        <p className="text-pretty text-[13px] leading-snug text-ink-2">{tVerify("inspectedBy", { name: record.inspectorName, date: data.inspectedOn })}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-[19px] font-medium leading-snug">{latest.name}</p>
        <p className="text-[13px] text-ink-3">{latest.neighbourhood}</p>
      </div>
      <ul className="flex flex-col border-t border-line-soft">
        {data.checks.map((c) => (
          <li key={c.key} className="flex h-9 items-center gap-2 border-b border-line-soft text-[14px] text-ink-2 last:border-b-0">
            <CheckIcon size={16} className="flex-none text-trust" />
            {tVerify(`steps.${c.key}`)}
          </li>
        ))}
      </ul>
      <span className="flex items-center gap-1 text-[13px] font-medium text-brand">
        {tVerify("openRecord")}
        <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

async function Facts({ count, className }: { count: number; className?: string }) {
  const tTrust = await getTranslations("trust");
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]", className)}>
      <span className="tnum">{tTrust("listingsVerified", { count })}</span>
      <span aria-hidden>·</span>
      <span>{tTrust("escrowProtected")}</span>
    </p>
  );
}

/*
  A split on the page itself: the words and the one action on the left, on
  calm space, and on the right the city a guest is flying into, its
  hillside homes in afternoon light. It replaced a dark dusk street under
  an 80% scrim, which read as mud and showed neither a home nor an arrival.
  Over the photo's edge sits the inspection slip. The hero fills the first
  screen under the header (64px on a desktop), so the next section starts
  below the fold rather than peeking. z-10 so the search's answer, which
  drops below the field, paints over what follows.
*/
async function SplitHero({ data }: { data: HeroData }) {
  const t = await getTranslations("landing");
  return (
    <section className="relative isolate z-10">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-6 pb-12 pt-10 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:items-center lg:gap-16 lg:py-12">
        <div className="flex flex-col items-start gap-6">
          <h1 className="max-w-[18ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[56px]">{t("heroTitle")}</h1>
          <p className="max-w-[40ch] text-[17px] leading-relaxed text-ink-2">{t("heroBody")}</p>
          <div className="mt-2 w-full max-w-[520px]">
            <HeroSearch />
          </div>
          <Facts count={data.count} className="text-ink-3" />
        </div>
        <div className="relative lg:h-full lg:max-h-[720px] lg:min-h-[520px]">
          <div className="relative h-52 overflow-hidden rounded-[16px] sm:h-80 lg:absolute lg:inset-0 lg:h-auto">
            <Image src="/images/experiences/kigali-1.jpg" alt={t("heroImageAlt")} fill priority sizes="(max-width: 1024px) 100vw, 640px" className="object-cover object-[50%_60%]" />
          </div>
          <InspectionSlip data={data} className="relative mx-4 -mt-16 sm:mx-auto sm:max-w-[380px] lg:absolute lg:bottom-10 lg:-left-12 lg:mx-0 lg:mt-0 lg:w-[380px]" />
        </div>
      </div>
    </section>
  );
}

/*
  The skyline at sunset across the whole hero: the hour most flights into
  Kigali land, so "when you land" is the picture rather than a claim about
  it. The words sit on the open sky in the upper left, where the photo is
  calm; a light scrim at the top and a heavier one at the foot keep white
  text legible without turning the gold to mud. The slip stands at the
  lower right over the rooftops. On a phone the photo is the top of the
  screen and the slip follows on the page.
*/
async function GoldenHero({ data }: { data: HeroData }) {
  const t = await getTranslations("landing");
  return (
    <section className="relative isolate z-10">
      <div className="relative">
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <Image src="/images/experiences/kigali-5.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[50%_65%]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,18,6,0.4)_0%,rgba(28,18,6,0.1)_38%,rgba(28,18,6,0.2)_62%,rgba(16,12,6,0.7)_100%)]" />
          {/* Darker behind the words only, so the gold stays bright on the right. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,16,6,0.62)_0%,rgba(24,16,6,0.4)_38%,rgba(24,16,6,0)_68%)]" />
        </div>
        <div className="mx-auto grid max-w-[1180px] gap-8 px-6 pb-16 pt-14 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:pb-12 lg:pt-20">
          <div className="flex flex-col items-start gap-6 lg:self-start">
            <h1 className="max-w-[16ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-white sm:text-[60px]">{t("heroTitle")}</h1>
            <p className="max-w-[42ch] text-[17px] leading-relaxed text-white/85">{t("heroBody")}</p>
            <div className="mt-2 w-full max-w-[540px]">
              <HeroSearch />
            </div>
            <Facts count={data.count} className="text-white/75" />
          </div>
          <InspectionSlip data={data} className="hidden lg:flex lg:self-end" />
        </div>
      </div>
      <div className="px-6 pt-6 lg:hidden">
        <InspectionSlip data={data} className="mx-auto max-w-[380px]" />
      </div>
    </section>
  );
}

/* The version before the unslop pass, kept for comparison: a dusk street under a dark scrim. */
async function StreetHero({ data }: { data: HeroData }) {
  const t = await getTranslations("landing");
  return (
    <section className="relative isolate z-10">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Image src="/images/experiences/kigali-2.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[50%_55%]" />
        <div className="absolute inset-0 bg-[rgba(12,10,8,0.58)] lg:bg-[linear-gradient(90deg,rgba(12,10,8,0.8)_0%,rgba(12,10,8,0.55)_40%,rgba(12,10,8,0.05)_100%)]" />
      </div>
      <div className="mx-auto grid max-w-[1180px] gap-10 px-6 pb-10 pt-16 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_384px] lg:gap-16 lg:pb-0 lg:pt-24">
        <div className="flex flex-col items-start gap-6 lg:self-center lg:pb-16">
          <h1 className="max-w-[13ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-white sm:text-[56px] lg:text-[64px]">{t("heroTitle")}</h1>
          <p className="max-w-[44ch] text-[17px] leading-relaxed text-white/80">{t("heroBody")}</p>
          <div className="w-full max-w-[560px]">
            <HeroSearch />
          </div>
          <Facts count={data.count} className="text-white/70" />
        </div>
        <InspectionSlip data={data} className="relative z-10 lg:-mb-16 lg:self-end" />
      </div>
    </section>
  );
}

/* The version the UI milestone shipped, kept for comparison: centred over the hillside, with a badge. */
async function OriginalHero({ data }: { data: HeroData }) {
  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tVerify = await getTranslations("verification");
  return (
    <section className="relative isolate z-10">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Image src="/images/experiences/kigali-1.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[50%_40%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,20,14,0.62)_0%,rgba(6,20,14,0.38)_45%,rgba(6,20,14,0.78)_100%)]" />
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-6 px-6 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[13px] font-semibold text-white">
          <ShieldIcon size={14} />
          {tVerify("badge")} · {tTrust("inspectedInPerson")}
        </span>
        <h1 className="max-w-[17ch] text-balance font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-[4.1rem]">{t("heroTitle")}</h1>
        <p className="max-w-[56ch] text-[17px] leading-relaxed text-white/85">{t("heroBody")}</p>
        <div className="mt-2 w-full max-w-[680px] text-left">
          <HeroSearch />
        </div>
        <Facts count={data.count} className="justify-center text-white/80" />
      </div>
    </section>
  );
}
