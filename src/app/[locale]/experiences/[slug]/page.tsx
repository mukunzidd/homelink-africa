import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { Gallery } from "@/components/ui/gallery";
import { PersonRow } from "@/components/ui/person-row";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { SeatsPanel } from "@/components/experiences/seats-panel";
import { ExperienceHighlights } from "@/components/experiences/experience-highlights";
import { InspectorRow } from "@/components/listing/inspector-row";
import { VerificationRecordPanel } from "@/components/listing/verification-record";
import { SupplyOwnerBand } from "@/components/listing/supply-owner-band";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experience = await repos().experiences.bySlug(slug);
  if (!experience) return {};
  return { title: experience.name, description: experience.summary };
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const experience = await repos().experiences.bySlug(slug);
  if (!experience) notFound();

  const t = await getTranslations("experiences");
  const tVerify = await getTranslations("verification");

  const interests = experience.interests
    .map((i) => t(`interest.${i}`))
    .join(" · ");

  const specs = [
    t("duration", { count: experience.durationHours }),
    t("groupMax", { count: experience.groupMax }),
    t("minAge", { age: experience.minAge }),
  ].join(" · ");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <SupplyOwnerBand
        kind="experience"
        supplyItemId={experience.id}
        rate={experience.pricePerPerson}
        rateLabel={t("perPerson")}
        availability={t("groupMax", { count: experience.groupMax })}
        record={experience.verification}
      />

      <Link
        href="/experiences"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToExperiences")}
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {experience.name}
        </h1>

        {/* The stay puts the place beside the badge; a day out puts where you
            are told to be standing, which is the fact people actually go
            looking for twice. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <VerifiedBadge label={tVerify("badge")} size="sm" />
          <span className="text-[15px] text-ink-2">
            {experience.meetingPoint}
          </span>
        </div>
      </header>

      <Gallery
        seed={experience.imageSeed}
        images={experience.images}
        alt={experience.name}
        verifiedLabel={tVerify("badge")}
      />

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col">
          <section className="flex flex-col gap-1 pb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {interests}
            </h2>
            <p className="text-[15px] text-ink-2">{specs}</p>
          </section>

          <div className="border-t border-line py-6">
            <InspectorRow record={experience.verification} />
          </div>

          <div className="border-t border-line py-6">
            <ExperienceHighlights experience={experience} />
          </div>

          <section className="flex flex-col gap-3 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("about")}
            </h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
              {experience.summary}
            </p>
          </section>

          {/*
            The one page in the product that names two people. Our inspector
            vouches for the day; the guide is who you actually spend it with,
            and they do not work for us. The trust ring stays on the inspector
            and the guide gets a plain disc, so the difference is visible
            before the caption under the name is read.
          */}
          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("guide")}
            </h2>
            <PersonRow
              name={experience.guideName}
              detail={t("guideRole")}
              tone="neutral"
            />
          </section>

          <div className="border-t border-line py-6">
            <VerificationRecordPanel
              record={experience.verification}
              escrowApplies={false}
              kind="experience"
            />
          </div>

          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("thingsToKnow")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { title: t("bringTitle"), body: t("bringBody") },
                {
                  // Not `ageNotice` — the booking panel already says that
                  // sentence a screen to the right, and repeating it verbatim
                  // spends a column on nothing.
                  title: t("ageTitle"),
                  body: t("ageBody", { age: experience.minAge }),
                },
                { title: t("weatherTitle"), body: t("weatherBody") },
              ].map((block) => (
                <div key={block.title} className="flex flex-col gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">
                    {block.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-2">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SeatsPanel experience={experience} />
        </aside>
      </div>
    </div>
  );
}
