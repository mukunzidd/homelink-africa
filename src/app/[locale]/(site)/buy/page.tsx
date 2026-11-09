import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { parseSaleSearch, saleSearchToQuery, SALE_SORTS, type RawParams } from "@/lib/search-params";
import { searchSales } from "@/lib/search";
import type { HomeForSale } from "@/lib/domain/types";
import { HomesModeSwitch } from "@/components/listing/homes-mode";
import { SortControl } from "@/components/listing/sort-control";
import { SaleRow } from "@/components/sale/sale-row";
import { SaleFilters } from "@/components/sale/sale-filters";
import { ActiveFilters } from "@/components/results/active-filters";
import { HoverSyncProvider, HoverTarget } from "@/components/results/hover-sync";
import { StaysMap, type StayPin } from "@/components/results/stays-map";
import { ViewToggle } from "@/components/results/view-toggle";
import { SparkIcon } from "@/components/ui/icons";
import { money, toMajor } from "@/lib/domain/money";
import { ListHeader, ListToolbar, ListEnd, MapPreviewLink } from "@/components/results/list-layout";
import { FilterSheet } from "@/components/results/filter-sheet";
import { PriceBars, medianMinor } from "@/components/results/lane-moments";
import { NoMatch } from "@/components/results/no-match";
import { BuySearchBar } from "@/components/sale/buy-search-bar";
import { BuyingFromAbroad } from "@/components/sale/buying-from-abroad";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sale" });
  return { title: t("metaTitle") };
}

export default async function BuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const search = parseSaleSearch(raw);
  const mapView = raw.view === "map";

  const t = await getTranslations("sale");
  const tResults = await getTranslations("results");
  const tSmart = await getTranslations("smart");
  const tEmpty = await getTranslations("empty");

  const r = repos();
  const [result, neighbourhoods, nightly, leases, allSales] = await Promise.all([
    searchSales({
      text: search.q,
      neighbourhood: search.neighbourhood,
      bedrooms: search.bedrooms,
      maxPrice: search.maxPrice,
      sort: search.sort,
    }),
    r.sales.neighbourhoods(),
    r.stays.list(),
    r.stays.list({ band: "long" }),
    r.sales.list(),
  ]);

  // The kind of building is not in the index yet; it narrows what came back.
  const homes = (await Promise.all(result.hits.map((h) => r.sales.byId(h.id))))
    .filter((h): h is HomeForSale => !!h)
    .filter((h) => !search.kind || h.kind === search.kind);

  const relaxed = result.relaxed.length > 0 && homes.length > 0;
  const tList = await getTranslations("list");
  const tHomes = await getTranslations("homes");

  const pins: StayPin[] = homes.map((h) => ({
    id: h.id,
    lat: h.location.lat,
    lng: h.location.lng,
    price: h.price,
    href: `/buy/${h.slug}`,
    name: h.name,
    area: h.neighbourhood,
    areaHref: (() => {
      const q = saleSearchToQuery({ ...search, neighbourhood: h.neighbourhood });
      return q ? `/buy?${q}` : "/buy";
    })(),
  }));
  const query = saleSearchToQuery(search);

  // The median price per m² across everything listed, the buyer's honest
  // answer to "is that a lot". All homes are priced in francs.
  const perSqm = (h: HomeForSale) => Math.round(h.price.minor / h.floorSqm);
  const median = medianMinor(allSales.map(perSqm));
  const currency = allSales[0]?.price.currency ?? "RWF";
  const activeCount = [search.neighbourhood, search.bedrooms, search.kind, search.maxPrice, search.near].filter(Boolean).length;

  const rows =
    homes.length === 0 ? (
      <NoMatch title={tEmpty("noResults")} body={t("emptyBody")} lane="buy">
        {allSales.slice(0, 3).map((home) => (
          <SaleRow key={home.id} home={home} medianPerSqm={median} near={search.near} />
        ))}
      </NoMatch>
    ) : (
      homes.map((home, i) => (
        <HoverTarget key={home.id} id={home.id}>
          <SaleRow home={home} medianPerSqm={median} near={search.near} priority={i === 0} />
        </HoverTarget>
      ))
    );

  const mapRows =
    homes.length === 0 ? (
      <div className="sm:col-span-2">{rows}</div>
    ) : (
      homes.map((home, i) => (
        <HoverTarget key={home.id} id={home.id}>
          <SaleRow home={home} medianPerSqm={median} near={search.near} priority={i === 0} layout="tile" />
        </HoverTarget>
      ))
    );

  const end = homes.length > 0 && (
    <ListEnd
      count={homes.length}
      lane="buy"
      others={[
        { label: tHomes("mode.rent"), href: "/stays?band=long" },
        { label: tList("abroadLink"), href: "#abroad" },
      ]}
    />
  );

  const filters = <SaleFilters neighbourhoods={neighbourhoods} />;

  const bars = [...allSales]
    .sort((a, b) => perSqm(b) - perSqm(a))
    .map((h) => ({
      label: `${h.neighbourhood} · ${t(`kind.${h.kind}`)}`,
      value: money(perSqm(h), h.price.currency),
      active: homes.some((x) => x.id === h.id) && homes.length < allSales.length,
    }));

  return (
    <HoverSyncProvider>
      {/* The map view keeps the header's 1180px container. It used to widen
          to 1440px with the same 24px gutters, which put the page's left edge
          50px outside the logo above it at a 1280px window; the wider map
          was not worth a page that no longer lined up with its own header. */}
      <div className={mapView ? "mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6" : "mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6 sm:py-8"}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <HomesModeSwitch
            mode="buy"
            carry={{ neighbourhood: search.neighbourhood, bedrooms: search.bedrooms }}
            counts={{ stay: nightly.length, rent: leases.length, buy: allSales.length }}
          />
          <BuySearchBar
            key={query}
            neighbourhoods={neighbourhoods}
            initial={{
              neighbourhood: search.neighbourhood,
              kind: search.kind,
              max: search.maxPrice ? String(toMajor(search.maxPrice)) : undefined,
            }}
          />
        </div>

        <ListHeader
          title={relaxed ? tSmart("closestCount", { count: homes.length }) : t("count", { count: homes.length })}
          subtitle={t("subtitle")}
        />

        {!mapView && (
          <PriceBars
            title={tList("sqmTitle")}
            caption={tList("sqmCaption")}
            bars={bars}
            marker={{ value: money(median, currency), label: tList("medianLabel") }}
            unit={tList("perSqmShort")}
          />
        )}

        <ListToolbar
          start={<ActiveFilters empty={<p className="text-[13px] text-ink-3">{tList("noFilters")}</p>} />}
          end={
            <>
              <FilterSheet count={activeCount} resultCount={homes.length}>
                {filters}
              </FilterSheet>
              <ViewToggle view={mapView ? "map" : "list"} />
              <SortControl
                value={search.sort}
                options={SALE_SORTS}
                labels={{
                  recommended: t("sort.recommended"),
                  priceAsc: tResults("sort.priceAsc"),
                  priceDesc: tResults("sort.priceDesc"),
                  size: t("sort.size"),
                }}
              />
            </>
          }
        />

        {relaxed && (
          <div className="flex items-start gap-3 rounded-card border border-warn/30 bg-warn-tint px-4 py-3">
            <SparkIcon className="mt-0.5 text-warn" />
            <p className="text-sm text-ink">
              <span className="font-semibold">{tSmart("relaxedTitle")}</span>{" "}
              {tSmart("relaxedBody", { what: result.relaxed.map((k) => tSmart(`relax.${k}`)).join(", ") })}
            </p>
          </div>
        )}

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
                  pins={pins} compact
                  className="h-[max(20rem,calc(100svh-var(--header-offset)-11rem))] rounded-card border border-line lg:h-[calc(100vh-10rem)]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[268px_1fr]">
            <aside className="hidden flex-col gap-4 lg:sticky lg:top-[calc(var(--header-offset)+4.5rem)] lg:flex lg:self-start">
              {homes.length > 0 && (
                <MapPreviewLink href={`/buy?${query}${query ? "&" : ""}view=map`}>
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

        {!mapView && <BuyingFromAbroad id="abroad" />}
      </div>
    </HoverSyncProvider>
  );
}
