import { CatalogProvider } from "@/components/booking/catalog-context";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { isIsoDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { flowPolicy } from "@/lib/booking/flow-text";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DayFlow } from "@/components/booking/day-flow";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title") };
}

/** Booking a day out: who is coming and when, then the shared steps. */
export default async function BookDay({
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
  if (!date || date < kigaliDay()) redirect(`/${locale}/experiences/${slug}`);
  const party = Math.min(Math.max(Number.parseInt(sp.party ?? "2", 10) || 2, 1), experience.groupMax);

  const intlLocale = INTL_LOCALES[locale as Locale];
  const [tB, tSearch, tCheckout] = await Promise.all([
    getTranslations("breadcrumb"),
    getTranslations("search"),
    getTranslations("checkout"),
  ]);
  const policy = await flowPolicy("experience", date, date, intlLocale, { requiresPermit: !!experience.requiresPermit });
  const back = `/experiences/${slug}?date=${date}&party=${party}`;
  const here = `/${locale}/experiences/${slug}/book?date=${date}&party=${party}`;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs trail={[{ label: tB("experiences"), href: "/experiences" }, { label: experience.name, href: back }, { label: tB("book") }]} />
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{tCheckout("title")}</h1>
      <Suspense fallback={<div className="h-96" />}>
        <CatalogProvider catalog={(await repos().admin.settings()).catalog}>
          <DayFlow
            experience={experience}
            init={{ slug, start: date, end: date, party }}
            text={{
              ...policy,
              facts: [tSearch("guestCount", { count: party }), experience.meetingPoint],
              title: experience.name,
              image: experience.images?.[0],
              imageSeed: experience.imageSeed,
              changeHref: back,
            }}
            signInHref={`/sign-in?next=${encodeURIComponent(here)}`}
          />
        </CatalogProvider>
      </Suspense>
    </div>
  );
}
