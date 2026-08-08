import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange, nightsBetween } from "@/lib/domain/dates";
import { countActiveFilters, parseStaySearch, type RawParams } from "@/lib/search-params";
import { ListingRow } from "@/components/listing/listing-row";
import { StayFilters } from "@/components/listing/stay-filters";
import { SortControl } from "@/components/listing/sort-control";
import { StaySearchBar } from "@/components/search/stay-search-bar";
import { AddDatesPrompt } from "@/components/search/add-dates-prompt";

export default async function StaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const search = parseStaySearch(await searchParams);
  const t = await getTranslations("results");
  const tEmpty = await getTranslations("empty");

  const [listings, neighbourhoods] = await Promise.all([
    repos().stays.list({
      neighbourhood: search.neighbourhood,
      minBedrooms: search.bedrooms,
      minSleeps: search.party,
      amenities: search.amenities.length ? search.amenities : undefined,
      band: search.band,
      sort: search.sort,
    }),
    repos().stays.neighbourhoods(),
  ]);

  const intlLocale = INTL_LOCALES[locale as Locale];
  const hasDates = !!search.from && !!search.to;
  const nights = hasDates ? nightsBetween(search.from!, search.to!) : 0;
  const activeFilters = countActiveFilters(search);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <StaySearchBar search={search} neighbourhoods={neighbourhoods} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {/* The count states the criteria behind it. A bare number invites
              the question "out of what?" at exactly the wrong moment. */}
          <h1 className="font-display text-2xl font-semibold text-ink">
            {hasDates
              ? t("countWithDates", {
                  count: listings.length,
                  range: formatDateRange(search.from!, search.to!, intlLocale),
                })
              : t("countNoDates", { count: listings.length })}
          </h1>
          {activeFilters > 0 && (
            <p className="text-sm text-ink-2">
              {t("activeFilters", { count: activeFilters })}
            </p>
          )}
        </div>

        <SortControl value={search.sort} />
      </div>

      {!hasDates && <AddDatesPrompt />}

      <div className="grid gap-6 lg:grid-cols-[268px_1fr]">
        {/* `self-start` matters: a grid item stretches by default, so without
            it the aside is as tall as the results column and sticky has
            nothing left to do. No internal scroll — that clipped the
            neighbourhood menu. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StayFilters neighbourhoods={neighbourhoods} />
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
              <ListingRow
                key={listing.id}
                listing={listing}
                from={search.from}
                to={search.to}
                party={search.party}
                nights={nights}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
