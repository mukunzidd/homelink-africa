import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange, nightsBetween } from "@/lib/domain/dates";
import { countActiveFilters, parseStaySearch, staySearchToQuery, type RawParams, type StaySearch } from "@/lib/search-params";
import { hasStructure } from "@/lib/search/parse";
import { intentHref } from "@/lib/search/intent-url";
import { parseForSite, searchStays, type StayInput } from "@/lib/search";
import type { Amenity, Listing } from "@/lib/domain/types";
import { ListingRow } from "@/components/listing/listing-row";
import { StayFilters } from "@/components/listing/stay-filters";
import { SortControl } from "@/components/listing/sort-control";
import { SearchPill } from "@/components/search/search-pill";
import { HomesModeSwitch } from "@/components/listing/homes-mode";
import { ActiveFilters } from "@/components/results/active-filters";
import { HoverSyncProvider, HoverTarget } from "@/components/results/hover-sync";
import { StaysMap, type StayPin } from "@/components/results/stays-map";
import { ViewToggle } from "@/components/results/view-toggle";
import { SparkIcon } from "@/components/ui/icons";
import { ListHeader, ListToolbar, ListEnd, MapPreviewLink } from "@/components/results/list-layout";
import { FilterSheet } from "@/components/results/filter-sheet";
import { NeighbourhoodBand, PriceBars, medianMinor, type NeighbourhoodTile } from "@/components/results/lane-moments";
import { NoMatch } from "@/components/results/no-match";
import { money } from "@/lib/domain/money";

import { AMENITIES } from "@/lib/search-params";

const ALL_AMENITIES = AMENITIES;

/**
 * The date range in a heading never breaks across lines. On a phone the H1
 * split "Nov 19 – 23, 2026" after "Nov", leaving a range nobody can read at a
 * glance. Messages take only strings, so the sentence is formatted around a
 * placeholder and the range goes back in as a nowrap span.
 */
const RANGE_SLOT = "\uE000";
function withUnbrokenRange(sentence: string, range: string) {
  const [before, after = ""] = sentence.split(RANGE_SLOT);
  return (
    <>
      {before}
      <span className="whitespace-nowrap">{range}</span>
      {after}
    </>
  );
}

function toInput(search: StaySearch): StayInput {
  return {
    text: search.q,
    neighbourhood: search.neighbourhood,
    bedrooms: search.bedrooms,
    // The party only filters when it was actually chosen; 2 is the default
    // the pill shows, not a requirement anybody stated.
    party: search.party !== 2 ? search.party : undefined,
    amenities: search.amenities,
    lease: search.band === "long",
    maxPrice: search.maxPrice,
    sort: search.sort,
  };
}

export default async function StaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const search = parseStaySearch(raw);

  // A whole sentence arriving as `q` — from a shared link, the browser's
  // address bar, or a search engine — is read the same way the palette reads
  // it and turned into ordinary filters, so the page, the chips and the back
  // button all agree. Only when `q` is the only thing set: once filters exist,
  // `q` is the leftover words and must be left alone.
  // The search bar's "Where" field sends a sentence the same way, alongside
  // the dates and party it already has, so those ride along: the sentence's
  // own reading wins where it says something, the bar's values fill the rest.
  const CARRIED = ["from", "to", "party", "band", "movein", "view"] as const;
  const onlyQ = Object.keys(raw).every((k) => k === "q" || (CARRIED as readonly string[]).includes(k));
  if (search.q && onlyQ) {
    const intent = await parseForSite(search.q, search.maxPrice?.currency ?? "USD");
    if (hasStructure(intent) || (intent.lane && intent.lane !== "stays")) {
      const href = intentHref(intent);
      const [path, qs] = href.split("?");
      const next = new URLSearchParams(qs);
      if (path === "/stays") {
        for (const k of CARRIED) {
          const v = raw[k];
          if (typeof v === "string" && !next.has(k)) next.set(k, v);
        }
      }
      redirect(`/${locale}${path}${next.size ? `?${next}` : ""}`);
    }
  }

  const t = await getTranslations("results");
  const tEmpty = await getTranslations("empty");
  const tSmart = await getTranslations("smart");

  const input = toInput(search);
  const [result, neighbourhoods, destinations, nightlyAll, leaseAll, salesAll] = await Promise.all([
    searchStays(input),
    repos().stays.neighbourhoods(),
    repos().stays.neighbourhoodsWithCounts(),
    repos().stays.list(),
    repos().stays.list({ band: "long" }),
    repos().sales.list(),
  ]);

  const listings = (
    await Promise.all(result.hits.map((h) => repos().stays.byId(h.id)))
  ).filter((l): l is Listing => !!l);

  // How many results each amenity would leave, so a chip says what pressing
  // it costs before anyone presses it. Counted without relaxation: a count
  // that quietly drops other filters would be a different question.
  const amenityCounts = Object.fromEntries(
    await Promise.all(
      ALL_AMENITIES.map(async (a) => {
        const set = new Set(search.amenities);
        set.add(a);
        const r = await searchStays({ ...input, amenities: [...set], limit: 100 });
        return [a, r.relaxed.length ? 0 : r.hits.length] as const;
      }),
    ),
  ) as Record<Amenity, number>;

  const intlLocale = INTL_LOCALES[locale as Locale];
  // A lease is priced by the month and applied for, not quoted per night, so
  // the whole date apparatus is beside the point in this lane.
  const isLease = search.band === "long";
  const hasDates = !isLease && !!search.from && !!search.to;
  const nights = hasDates ? nightsBetween(search.from!, search.to!) : 0;
  const activeFilters = countActiveFilters(search);
  const mapView = raw.view === "map";

  const rowQuery = new URLSearchParams();
  if (isLease) rowQuery.set("band", "long");
  if (search.from && !isLease) rowQuery.set("from", search.from);
  if (search.to && !isLease) rowQuery.set("to", search.to);
  const pins: StayPin[] = listings.map((l) => ({
    id: l.id,
    lat: l.location.lat,
    lng: l.location.lng,
    price: isLease && l.monthlyRate ? l.monthlyRate : l.nightlyRate,
    href: `/stays/${l.slug}${rowQuery.size ? `?${rowQuery}` : ""}`,
    name: l.name,
    area: l.neighbourhood,
    areaHref: (() => {
      const q = staySearchToQuery({ ...search, neighbourhood: l.neighbourhood });
      return q ? `/stays?${q}` : "/stays";
    })(),
  }));

  const relaxedNote = result.relaxed.length > 0 && listings.length > 0 && (
    <div className="flex items-start gap-3 rounded-card border border-warn/30 bg-warn-tint px-4 py-3">
      <SparkIcon className="mt-0.5 text-warn" />
      <p className="text-sm text-ink">
        <span className="font-semibold">{tSmart("relaxedTitle")}</span>{" "}
        {result.relaxed.length === 1 && result.relaxed[0] === "text"
          ? tSmart("relaxedTextBody", { text: search.q ?? "" })
          : tSmart("relaxedBody", {
              what: result.relaxed.map((k) => tSmart(`relax.${k}`)).join(", "),
            })}
      </p>
    </div>
  );

  const tList = await getTranslations("list");
  const tHomes = await getTranslations("homes");
  const lane = isLease ? "rent" : "stay";
  const moveIn = typeof raw.movein === "string" && /^\d{4}-\d{2}$/.test(raw.movein) ? raw.movein : undefined;
  const pool = isLease ? leaseAll : nightlyAll;

  // Nothing at all, even after relaxing: say so, and still show the closest
  // homes rather than an empty box.
  const nearest = listings.length === 0 ? pool.slice(0, 3) : [];

  const rows =
    listings.length === 0 ? (
      <NoMatch
        title={tEmpty("noResults")}
        body={search.q ? tList("noMatchText", { text: search.q }) : tEmpty("noResultsBody")}
        lane={lane}
      >
        {nearest.map((listing) => (
          <ListingRow key={listing.id} listing={listing} lease={isLease} near={search.near} />
        ))}
      </NoMatch>
    ) : (
      listings.map((listing, i) => (
        <HoverTarget key={listing.id} id={listing.id}>
          <ListingRow
            listing={listing}
            from={search.from}
            to={search.to}
            party={search.party}
            nights={nights}
            lease={isLease}
            near={search.near}
            priority={i === 0}
            moveIn={moveIn}
          />
        </HoverTarget>
      ))
    );

  const mapRows =
    listings.length === 0 ? (
      <div className="sm:col-span-2">{rows}</div>
    ) : (
      listings.map((listing, i) => (
        <HoverTarget key={listing.id} id={listing.id}>
          <ListingRow
            layout="tile"
            listing={listing}
            from={search.from}
            to={search.to}
            party={search.party}
            nights={nights}
            lease={isLease}
            near={search.near}
            priority={i === 0}
            moveIn={moveIn}
          />
        </HoverTarget>
      ))
    );

  const others = isLease
    ? [{ label: tHomes("mode.stay"), href: "/stays" }, { label: tHomes("mode.buy"), href: "/buy" }]
    : [{ label: tHomes("mode.rent"), href: "/stays?band=long" }, { label: tHomes("mode.buy"), href: "/buy" }];

  const end = listings.length > 0 && <ListEnd count={listings.length} lane={lane} others={others} />;

  // The count states the criteria behind it. A bare number invites the
  // question "out of what?" at exactly the wrong moment.
  const title =
    result.relaxed.length > 0 && listings.length > 0
      ? tSmart("closestCount", { count: listings.length })
      : isLease
        ? tList("rentCount", { count: listings.length })
        : hasDates
          ? withUnbrokenRange(
              t("countWithDates", { count: listings.length, range: RANGE_SLOT }),
              formatDateRange(search.from!, search.to!, intlLocale),
            )
          : t("countNoDates", { count: listings.length });

  // One promise per lane, said once here instead of a pill on every row.
  const subtitle = isLease ? tList("rentPromise") : tList("stayPromise");

  const filters = (
    <StayFilters neighbourhoods={neighbourhoods} amenities={ALL_AMENITIES} counts={amenityCounts} />
  );

  // The lane's moment. Stay: neighbourhoods as places with a photograph.
  // Rent: the going monthly rate in each, so a tenant learns the city's
  // prices before they open a single listing.
  const byHood = new Map<string, Listing[]>();
  for (const l of pool) byHood.set(l.neighbourhood, [...(byHood.get(l.neighbourhood) ?? []), l]);
  const hoodHref = (name: string) => {
    const q = staySearchToQuery({ ...search, neighbourhood: search.neighbourhood === name ? undefined : name });
    return q ? `/stays?${q}` : "/stays";
  };
  const tiles: NeighbourhoodTile[] = [...byHood.entries()]
    .map(([name, ls]) => {
      const cheapest = ls.reduce((a, b) => (a.nightlyRate.minor <= b.nightlyRate.minor ? a : b));
      const pictured = ls.find((l) => l.images?.length) ?? ls[0];
      return {
        name,
        count: ls.length,
        from: cheapest.nightlyRate,
        image: pictured.images?.[0],
        seed: pictured.imageSeed,
        href: hoodHref(name),
        active: search.neighbourhood === name,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const rentBars = [...byHood.entries()]
    .map(([name, ls]) => {
      const rates = ls.flatMap((l) => (l.monthlyRate ? [l.monthlyRate] : []));
      return { name, rates };
    })
    .filter((x) => x.rates.length)
    .map(({ name, rates }) => ({
      label: name,
      value: money(medianMinor(rates.map((r) => r.minor)), rates[0].currency),
      href: hoodHref(name),
      active: search.neighbourhood === name,
    }))
    .sort((a, b) => b.value.minor - a.value.minor);

  const moment = mapView ? null : isLease ? (
    <PriceBars title={tList("rentBarsTitle")} caption={tList("rentBarsCaption")} bars={rentBars} unit={tList("perMonthShort")} />
  ) : (
    <NeighbourhoodBand tiles={tiles} />
  );

  const toolbar = (
    <ListToolbar
      start={<ActiveFilters empty={<p className="text-[13px] text-ink-3">{tList("noFilters")}</p>} />}
      end={
        <>
          <FilterSheet count={activeFilters} resultCount={listings.length}>
            {filters}
          </FilterSheet>
          <ViewToggle view={mapView ? "map" : "list"} />
          <SortControl value={search.sort} />
        </>
      }
    />
  );

  return (
    <HoverSyncProvider>
      {/* The map view keeps the header's 1180px container. It used to widen
          to 1440px with the same 24px gutters, which put the page's left edge
          50px outside the logo above it at a 1280px window; the wider map
          was not worth a page that no longer lined up with its own header. */}
      <div className={mapView ? "mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6" : "mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6 sm:py-8"}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <HomesModeSwitch
            mode={isLease ? "rent" : "stay"}
            carry={{ neighbourhood: search.neighbourhood, bedrooms: search.bedrooms }}
            counts={{ stay: nightlyAll.length, rent: leaseAll.length, buy: salesAll.length }}
          />
          <div className="min-w-0 lg:flex-1">
            <SearchPill
              key={isLease ? "rent" : "stay"}
              search={search}
              destinations={destinations}
              mode={isLease ? "rent" : "stay"}
              moveIn={moveIn}
            />
          </div>
        </div>

        <ListHeader title={title} subtitle={subtitle} />
        {moment}
        {toolbar}
        {relaxedNote}

        {mapView ? (
          // Beside a map the list column is under 600px, where the row card
          // squeezed its text into a 140px column. Two stacked tiles per row
          // read better there, and on a phone the tile is the compact row.
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="order-2 grid content-start gap-4 sm:grid-cols-2 lg:order-1">
              {mapRows}
              {end && <div className="sm:col-span-2">{end}</div>}
            </div>
            <div className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-[calc(var(--header-offset)+4.5rem)]">
                {/* On a phone the map takes most of the screen but stops short
                    of all of it: dragging pans the map, so the strip of list
                    left showing below it, and the sticky toolbar above, are
                    where a thumb can still scroll the page. */}
                <StaysMap
                  pins={pins}
                  className="h-[max(20rem,calc(100svh-var(--header-offset)-11rem))] rounded-card border border-line lg:h-[calc(100vh-10rem)]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[268px_1fr]">
            {/* `self-start` matters: a grid item stretches by default, so without
                it the aside is as tall as the results column and sticky has
                nothing left to do. */}
            <aside className="hidden flex-col gap-4 lg:sticky lg:top-[calc(var(--header-offset)+4.5rem)] lg:flex lg:self-start">
              {listings.length > 0 && (
                <MapPreviewLink href={`/stays?${staySearchToQuery(search)}${staySearchToQuery(search) ? "&" : ""}view=map`}>
                  <StaysMap pins={pins} preview className="h-36" />
                </MapPreviewLink>
              )}
              {filters}
            </aside>

            <div className="flex flex-col gap-3">
              {rows}
              {end}
            </div>
          </div>
        )}
      </div>
    </HoverSyncProvider>
  );
}
