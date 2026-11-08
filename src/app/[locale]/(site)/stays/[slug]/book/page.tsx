import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { flowPolicy } from "@/lib/booking/flow-text";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FlowShell } from "@/components/booking/flow-shell";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title") };
}

/**
 * Booking a stay by the night.
 *
 * Dates and party come from the URL, as before, so the flow is shareable
 * and survives a refresh; anything unusable sends the guest back to pick
 * again rather than guessing on their behalf, since a wrong date here costs
 * real money. Everything the guest types lives in the draft (FlowShell).
 */
export default async function BookStay({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; party?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const listing = await repos().stays.bySlug(slug);
  if (!listing) notFound();

  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from : null;
  const to = isIsoDate(sp.to) ? sp.to : null;
  if (!from || !to || nightsBetween(from, to) < 1 || from < kigaliDay()) redirect(`/${locale}/stays/${slug}`);

  const party = Math.min(Math.max(Number.parseInt(sp.party ?? "2", 10) || 2, 1), listing.sleeps);
  const intlLocale = INTL_LOCALES[locale as Locale];
  const [tB, tSearch, tListing, tCheckout] = await Promise.all([
    getTranslations("breadcrumb"),
    getTranslations("search"),
    getTranslations("listing"),
    getTranslations("checkout"),
  ]);
  const policy = await flowPolicy("stay", from, to, intlLocale);
  const back = `/stays/${slug}?from=${from}&to=${to}&party=${party}`;
  const here = `/${locale}/stays/${slug}/book?from=${from}&to=${to}&party=${party}`;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs
        trail={[
          { label: tB("homes"), href: "/stays" },
          { label: listing.name, href: back },
          { label: tB("book") },
        ]}
      />
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{tCheckout("title")}</h1>
      <Suspense fallback={<div className="h-96" />}>
        <FlowShell
          flow="stay"
          init={{ slug, start: from, end: to, party }}
          supply={{ kind: "stay", item: listing }}
          text={{
            ...policy,
            facts: [
              tSearch("guestCount", { count: party }),
              tListing("nightsTotal", { count: nightsBetween(from, to) }),
              `${listing.neighbourhood}, ${listing.city}`,
            ],
            title: listing.name,
            image: listing.images?.[0],
            imageSeed: listing.imageSeed,
            changeHref: back,
          }}
          houseRules={listing.houseRules}
          rulesLane="stay"
          rails={["card", "mobileMoney"]}
          escrow={{ title: tCheckout("escrowTitle"), body: tCheckout("escrowBody") }}
          signInHref={`/sign-in?next=${encodeURIComponent(here)}`}
        />
      </Suspense>
    </div>
  );
}
