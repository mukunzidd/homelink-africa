import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import type { ExperienceInterest } from "@/lib/domain/types";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { MoneyText } from "@/components/ui/money-text";
import { Button } from "@/components/ui/button";
import { ClockIcon, UsersIcon } from "@/components/ui/icons";
import { InterestFilter } from "@/components/experiences/interest-filter";

const INTERESTS = [
  "wildlife",
  "culture",
  "city",
  "hiking",
  "lake",
  "food",
] as const;

export default async function ExperiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ interest?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const interest = INTERESTS.includes(sp.interest as ExperienceInterest)
    ? (sp.interest as ExperienceInterest)
    : undefined;

  const t = await getTranslations("experiences");
  const tVerify = await getTranslations("verification");
  const tEmpty = await getTranslations("empty");

  const experiences = await repos().experiences.list({ interest });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("title")}
        </h1>
        <p className="max-w-[60ch] text-[15px] text-ink-2">
          {t("subtitle", { count: experiences.length })}
        </p>
      </header>

      <InterestFilter interests={INTERESTS} />

      {experiences.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            {tEmpty("noResults")}
          </h2>
          <p className="mt-2 max-w-[56ch] text-sm text-ink-2">
            {tEmpty("noResultsBody")}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((experience) => (
            <article
              key={experience.id}
              className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-pop)]"
            >
              <Link href={`/experiences/${experience.slug}`}>
                <SupplyImage seed={experience.imageSeed} className="h-40">
                  <span className="absolute left-3 top-3">
                    <VerifiedBadge label={tVerify("badge")} size="sm" />
                  </span>
                </SupplyImage>
              </Link>

              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
                  {experience.interests
                    .map((i) => t(`interest.${i}`))
                    .join(" · ")}
                </p>

                <Link
                  href={`/experiences/${experience.slug}`}
                  className="rounded-ctl"
                >
                  <h2 className="font-display text-xl font-semibold leading-tight text-ink">
                    {experience.name}
                  </h2>
                </Link>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <ClockIcon size={14} className="text-ink-3" />
                    {t("duration", { count: experience.durationHours })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UsersIcon size={14} className="text-ink-3" />
                    {t("groupMax", { count: experience.groupMax })}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <MoneyText
                    amount={experience.pricePerPerson}
                    className="text-lg font-bold text-ink"
                  />
                  <span className="text-sm text-ink-3">{t("perPerson")}</span>
                </div>

                <Link
                  href={`/experiences/${experience.slug}`}
                  className="mt-auto pt-3"
                >
                  <Button size="sm" variant="secondary" fullWidth>
                    {t("book")}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
