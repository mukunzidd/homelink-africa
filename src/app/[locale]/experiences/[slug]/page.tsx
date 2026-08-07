import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { Gallery } from "@/components/ui/gallery";
import { SeatsPanel } from "@/components/experiences/seats-panel";
import { VerificationRecordPanel } from "@/components/listing/verification-record";
import { ClockIcon, PinIcon, UsersIcon } from "@/components/ui/icons";

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

  const facts = [
    {
      icon: <ClockIcon size={15} />,
      label: t("duration", { count: experience.durationHours }),
    },
    {
      icon: <UsersIcon size={15} />,
      label: t("groupMax", { count: experience.groupMax }),
    },
    {
      icon: <PinIcon size={15} />,
      label: experience.meetingPoint,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-8">
      <Link
        href="/experiences"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToExperiences")}
      </Link>

      <header className="flex flex-col gap-4">
        <Gallery
          seed={experience.imageSeed}
          verifiedLabel={tVerify("badge")}
        />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
            {experience.interests.map((i) => t(`interest.${i}`)).join(" · ")} ·{" "}
            {t("minAge", { age: experience.minAge })}
          </p>
          <h1 className="max-w-[22ch] text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink">
            {experience.name}
          </h1>
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("about")}
            </h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
              {experience.summary}
            </p>
          </section>

          <ul className="grid gap-2 sm:grid-cols-3">
            {facts.map((fact) => (
              <li
                key={fact.label}
                className="flex items-center gap-2.5 rounded-ctl border border-line bg-surface px-3.5 py-3 text-sm text-ink-2"
              >
                <span className="flex-none text-ink-3">{fact.icon}</span>
                {fact.label}
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
              {t("guide")}
            </h2>
            {/* Named, like the inspector. The whole product runs on the claim
                that there is a specific person behind each thing we sell. */}
            <p className="font-display text-xl font-semibold text-ink">
              {experience.guideName}
            </p>
          </section>

          <VerificationRecordPanel
            record={experience.verification}
            escrowApplies={false}
            kind="experience"
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SeatsPanel experience={experience} />
        </aside>
      </div>
    </div>
  );
}
