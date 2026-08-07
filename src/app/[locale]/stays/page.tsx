import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { ListingRow } from "@/components/listing/listing-row";
import { StayFilters } from "@/components/listing/stay-filters";
import type { DurationBand } from "@/lib/domain/types";

export default async function StaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ band?: string; bedrooms?: string; amenities?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations("nav");
  const tEmpty = await getTranslations("empty");

  const band = (["short", "medium", "long"] as const).includes(
    sp.band as DurationBand,
  )
    ? (sp.band as DurationBand)
    : undefined;

  const listings = await repos().stays.list({
    band,
    minBedrooms: sp.bedrooms ? Number(sp.bedrooms) : undefined,
    amenities: sp.amenities ? sp.amenities.split(",") : undefined,
  });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("stays")}
        </h1>
        <p className="text-sm text-ink-2">
          {listings.length} in Kigali, every one inspected in person.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[248px_1fr]">
        {/* Filter rail, left. A Booking.com convention we deliberately keep. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StayFilters />
        </aside>

        <div className="flex flex-col gap-3">
          {listings.length === 0 ? (
            <div className="rounded-card border border-line bg-surface p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                {tEmpty("noResults")}
              </h2>
              <p className="mt-2 max-w-[56ch] text-sm text-ink-2">
                {tEmpty("noResultsBody")}
              </p>
            </div>
          ) : (
            listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
