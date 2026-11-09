import { CatalogProvider } from "@/components/booking/catalog-context";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { DriveMode } from "@/lib/domain/types";
import { isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { flowPolicy } from "@/lib/booking/flow-text";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CarFlow } from "@/components/booking/car-flow";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title") };
}

/** Booking a car: who drives and where we meet, then the shared steps. */
export default async function BookCar({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; driveMode?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const vehicle = await repos().mobility.bySlug(slug);
  if (!vehicle) notFound();

  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from : null;
  const to = isIsoDate(sp.to) && from && sp.to >= from ? sp.to : null;
  if (!from || !to || from < kigaliDay()) redirect(`/${locale}/cars/${slug}`);

  const initialMode: DriveMode =
    sp.driveMode === "withDriver" || !vehicle.driveModes.includes("selfDrive") ? "withDriver" : "selfDrive";
  const intlLocale = INTL_LOCALES[locale as Locale];
  const tBooking = await getTranslations("booking");
  const [tB, tCars, tCheckout] = await Promise.all([
    getTranslations("breadcrumb"),
    getTranslations("cars"),
    getTranslations("checkout"),
  ]);
  const policy = await flowPolicy("car", from, to, intlLocale);
  const back = `/cars/${slug}?from=${from}&to=${to}`;
  const here = `/${locale}/cars/${slug}/book?from=${from}&to=${to}&driveMode=${initialMode}`;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs trail={[{ label: tB("cars"), href: "/cars" }, { label: vehicle.name, href: back }, { label: tB("book") }]} />
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{tCheckout("title")}</h1>
      <Suspense fallback={<div className="h-96" />}>
        <CatalogProvider catalog={(await repos().admin.settings()).catalog}>
          <CarFlow
            vehicle={vehicle}
            initialMode={initialMode}
            init={{ slug, start: from, end: to, party: 1 }}
            text={{
              ...policy,
              facts: [tBooking("days", { count: nightsBetween(from, to) + 1 }), tCars("seats", { count: vehicle.seats })],
              title: vehicle.name,
              image: vehicle.images?.[0],
              imageSeed: vehicle.imageSeed,
              changeHref: back,
            }}
            signInHref={`/sign-in?next=${encodeURIComponent(here)}`}
          />
        </CatalogProvider>
      </Suspense>
    </div>
  );
}
