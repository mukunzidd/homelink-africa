import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, isIsoDate } from "@/lib/domain/dates";
import { quoteExperience } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StepSpine } from "@/components/checkout/step-spine";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SummaryRow } from "@/components/checkout/summary-row";

export default async function BookExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ date?: string; party?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const experience = await repos().experiences.bySlug(slug);
  if (!experience) notFound();

  const sp = await searchParams;
  const date = isIsoDate(sp.date) ? sp.date : null;
  if (!date) redirect(`/${locale}/experiences/${slug}`);

  const parsed = Number(sp.party);
  const party =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= experience.groupMax
      ? parsed
      : 2;

  const quote = quoteExperience(experience, party);
  if (!quote) redirect(`/${locale}/experiences/${slug}`);

  const t = await getTranslations("checkout");
  const tB = await getTranslations("breadcrumb");
  const tExp = await getTranslations("experiences");
  const tVerify = await getTranslations("verification");
  const tList = await getTranslations("list");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const day = formatDate(date, intlLocale);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <Breadcrumbs
        trail={[
          { label: tB("experiences"), href: "/experiences" },
          { label: experience.name, href: `/experiences/${experience.slug}` },
          { label: tB("book") },
        ]}
      />
      <StepSpine current={3} lane="experience" />

      <h1 className="font-display text-3xl font-semibold text-ink">
        {t("title")}
      </h1>

      <SummaryRow
        imageSeed={experience.imageSeed}
        image={experience.images?.[0]}
        title={experience.name}
        facts={[day, tList("people", { count: party })]}
        changeHref={`/experiences/${experience.slug}`}
        changeLabel={t("changeDates")}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm
          item={{
            kind: "experience",
            id: experience.id,
            slug: experience.slug,
            name: experience.name,
            unitRate: experience.pricePerPerson,
          }}
          quote={quote}
          units={party}
          detailHref={`/experiences/${experience.slug}`}
          confirmQuery={{
            slug: experience.slug,
            date,
            party: String(party),
          }}
          referenceSeed={`${experience.id}:${date}:${party}`}
          // The detail page states one cancellation rule for a day out, the
          // weather one, and this repeats it rather than inventing a window.
          cancellationNote={t("kinds.experience.cancellation")}
          guarantee={{
            inspector: experience.verification.inspectorName,
            inspectedOn: formatDate(experience.verification.inspectedAt, intlLocale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            points: experience.verification.checklistPoints,
          }}
        />

        {/* Below lg the summary row above stands in for this card, which would
            otherwise arrive after the Pay button. */}
        <aside className="hidden flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-20 lg:flex">
          <h2 className="text-xs font-medium text-ink-3">
            {t("summaryTitle.experience")}
          </h2>

          <SupplyImage
            seed={experience.imageSeed}
            src={experience.images?.[0]}
            alt={experience.name}
            sizes="320px"
            className="h-28 rounded-inner"
          />

          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              {experience.name}
            </h3>
            <p className="text-[13px] text-ink-3">{experience.meetingPoint}</p>
          </div>

          <VerifiedBadge label={tVerify("badge")} size="sm" className="self-start" />

          <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tExp("whenLabel")}</dt>
              <dd className="tnum text-right text-ink">
                {day}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tExp("peopleLabel")}</dt>
              <dd className="text-right text-ink">{party}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tExp("guide")}</dt>
              <dd className="text-right text-ink">{experience.guideName}</dd>
            </div>
          </dl>

          <Link
            href={`/experiences/${experience.slug}`}
            className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("changeDates")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
