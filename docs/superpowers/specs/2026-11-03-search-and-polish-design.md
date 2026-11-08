# Search and polish: make HomeLink feel finished

**Status:** built, awaiting review. Written 2026-11-03.

## Why this exists

The owner asked for the UI to look and feel finished, with search that
seems intelligent, taking nextlinehomes.com as a reference. They named Typesense or
Meilisearch and left the rest to the builder. The real-data milestone
(`2026-08-10-real-data-milestone.md`) is paused behind this, not abandoned. Its
step 1 is in fact already done: `main` and `ui-milestone` point at the same
commit.

That milestone's rule "no screen may move" belongs to the Postgres port, which
wants a pixel-identical before and after. This pass deliberately moves screens,
and it lands first, so the Postgres port later diffs against the new screens.

## What the reference does that HomeLink did not

Crawled with Playwright on 2026-11-03, desktop and mobile:

- A ⌘K "Smart search" that takes a sentence ("Apartment for rent under
  800000 RWF, 2 beds, parking") and offers example queries.
- A photographic hero with one search field over it.
- Neighbourhood cards on the landing page, each opening a filtered search.
- Saved homes, share links, and an affordability box on the detail page.
- A footer with somewhere to go.

What HomeLink already did better, and keeps: the inspection record, escrow,
honest scarcity, three languages, four currencies, dark mode, and copy with a
voice. The reference is busier than it is useful (four calculators, agent
cards with personal Gmail addresses); none of that is copied.

## Decisions

- **Meilisearch, pinned to `v1.56.1`, in Docker.** Chosen over Typesense
  because typo tolerance, synonyms, and filter syntax are all one settings
  PATCH, and it needs no schema declaration up front. MIT licence.
- **Search is a service beside `repos()`, not inside it.** `src/lib/search/`
  exposes `search()` choosing between a Meilisearch engine and an in-process
  engine over the fixtures. The fixtures rule from the previous milestone holds:
  the app must run with no containers, so the local engine is a real
  implementation (fuzzy matching, the same filters), not a stub.
- **The intelligence is a parser, and it is honest about what it did.** A
  sentence is parsed into an intent (lane, neighbourhood, bedrooms, party,
  price ceiling, amenities, lease band, dates) and the page shows that
  interpretation as removable chips. Nobody has to trust a black box: "2+
  bedrooms · Kimihurura · under $150 · Parking" is printed, and each chip can
  be taken back.
- **Landmarks resolve to neighbourhoods.** People in Kigali give directions by
  landmark. "Near the convention centre" means Kimihurura, "near the stadium"
  Remera, "the golf course" Nyarutarama, "the embassies" Kacyiru, "downtown"
  Kiyovu. The chip says "Kimihurura (convention centre)" so the mapping is
  visible.
- **Zero results relax, out loud.** When the parsed filters match nothing, the
  page drops the least important constraint (price, then amenities, then
  bedrooms, then place), shows what is closest, and says which constraint was
  relaxed. An empty page is a dead end; a silent relaxation is a lie.
- **Maps use tile images and no map library.** A small slippy map renders
  raster tiles and price pins. CARTO's basemaps were the first choice, for
  their dark style, and every tile came back as an "API KEY REQUIRED" image,
  so the tiles are OpenStreetMap's and dark mode is a CSS filter over them. Exact addresses are not shown before booking, so the detail page draws
  an approximate area, not a pin. Tile URL is configurable; production needs a
  tile provider agreement, which is noted, not solved.
- **Saved homes live in `localStorage`** until accounts exist. The heart is on
  every card, row, and detail page; `/saved` lists them. Phase 2 moves the list
  to the account with no change to the component API.
- **Inventory grows from six stays to twelve,** with varied modes (some
  nightly only, some lease only) so the Renting lane finally removes
  something. They reuse the existing placeholder photographs, as the original
  six already do.
- **Tests arrive with the parser.** Vitest, because the parser is the first code
  here whose correctness cannot be checked by looking at it. This also starts
  step 3 of the real-data milestone.

## What changes on screen

- **Header:** a Smart search button with ⌘K, and a Saved link.
- **Smart search palette:** live interpretation chips, instant grouped results
  (stays, cars, days out, neighbourhoods) with highlighted matches, example
  queries, recent searches, full keyboard navigation.
- **Landing:** photographic hero with the smart search field; lanes; featured
  stays; neighbourhoods with counts and starting prices; how verification and
  escrow work; days out; a full footer.
- **Stays results:** accepts `q`; interpretation chips; relaxation notice; max
  price; facet counts on amenity chips; a list/map toggle with a split view.
- **Stay detail:** save, share, and an approximate-area map.

## Non-goals

- No LLM in the loop. The parser is deterministic and testable; an LLM can sit
  in front of it later and emit the same intent.
- No new lanes, accounts, payments, or realtime.
- No calculators, agent directory, or newsletter.

## Left for later

- Kinyarwanda copy for the new strings was written by the assistant, like the
  ~130 before it, and needs a native reader.
- Indexing on write. Today the index is rebuilt by `make search-reset`; when
  Postgres lands, a trigger or queue keeps it current.

## Measured on the way

- Headless screenshots of a long page show grey boxes where lazy images have
  not loaded yet. The sweep script scrolls the page and waits for every image
  before capturing; without that, two experience photographs looked missing.
- A server component that imports a constant from a `"use client"` module
  receives a client reference, not the value. `EXAMPLE_KEYS` lives in
  `lib/search/examples.ts` for that reason.
- Dates formatted on both server and client fail hydration: Node and Chrome
  ship different ICU data, and "Nov 9 – 16" differs by a thin space. The
  landing showcase formats them on the server and passes the string down.
- The search pill's date summary hit the same ICU difference on the results
  page. Those two spans carry `suppressHydrationWarning`, because the text is
  the same range and only the space character differs.
- `cn` here joins strings and does not merge Tailwind classes, so
  `inline-flex` plus a conditional `hidden` left the element visible: the
  later rule in the generated CSS won. Display classes are now chosen with a
  ternary, never stacked.

## Second pass: every list page in one frame (2026-11-04)

Two audits from a first-time visitor's point of view, one for UX and one for
visual design, found the five list pages using three card designs and five
button styles, and none of them feeling like a place. What changed:

- **One card.** `components/results/result-card.tsx` is the only result card,
  in a row layout (homes) and a tile layout (cars, days out, landing), with a
  compact phone layout for tiles. Sans titles, one quiet CTA, the whole card
  is the link. The green "Verified" pill on every card became the inspector's
  initials, name and date (`InspectedBy`), since everything listed is
  verified and the person is the claim.
- **One frame.** `list-layout.tsx`: a count headline with one promise line,
  a toolbar that sticks under the header (`--header-offset`, measured per
  breakpoint), and a closing block that says how many that was and takes a
  request for what was missing. In grids it fills the last row.
- **Honest scarcity.** "2 left for these dates" only appears once dates are
  chosen, in every lane. Without dates a stay's CTA is "Check dates" and
  lands on the booking panel.
- **One moment per lane.** Stay: a band of neighbourhoods with photographs.
  Rent: the median monthly rent by neighbourhood. Buy: price per m² home by
  home against the median, plus a "below median" tag on rows. Cars: a
  pick-up bar and what every hire includes. Days out: a map of Rwanda with
  the drive from Kigali on each pin.
- **Lane-specific search.** Rent asks Where, Move in, Bedrooms; Buy asks
  Where, Type, Budget; Cars asks Pick up, Return, Hand-over; Days out asks
  Date and People. "Where" in the stay pill takes a sentence and routes it
  through the parser, so there is one clever box.
- **Travel times.** `lib/domain/landmarks.ts` puts the parser's seven
  landmarks on the map. Every home says how far it is from the city centre
  (or a landmark the visitor picks), detail pages list all seven, and maps
  draw them. Estimated, labelled as estimated; Phase 2 swaps in routing.
- **Phones.** Search folds to one line; filters open as a bottom sheet;
  every detail page has a sticky price and action bar that steps aside when
  the real panel is on screen.
- **Search.** Zero results now say what matched nothing and show the closest
  homes; dated searches show totals; the empty window leads with recently
  viewed places, recent searches, saved count and examples for the current
  lane. Listing keywords derive "view" and "stairs/parents" from the
  listing's own summary, never invented.
- **New pages.** `/neighbourhoods` and `/neighbourhoods/[name]` (portrait,
  stay/rent/buy prices, travel times, what we have there). Saved groups by
  section, keeps a note per item, and compares two or three homes.
  Signed-out Trips and Messages show what they will hold instead of "this
  screen belongs to someone else".
- **Facts buyers and tenants asked for.** Leases carry deposit, what is
  included and the free-from date; homes for sale carry the year built and a
  masked land registry parcel number. Buy shows RWF beside the converted
  price, and has a "buying from abroad" guide.

Not done, because it needs material rather than code: a consistent photo
style for the four cars (same angle, same setting).

## Review and fixes, 2026-11-05

Every screen rendered in Playwright as the role that uses it, at 1280 and
390, light and dark: 35 screens, 89 renders, 194 internal links. Three
reviewers graded them (none A, 24 B, 10 C, one F) and 22 findings were
fixed in the same pass. The ones that were wrong rather than unpolished:

- **The 404 was a Next.js runtime error.** The root layout is a
  pass-through, so an unmatched URL rendered without `<html>`. There is now
  a localised `[locale]/not-found.tsx` and a `[locale]/[...rest]` catch-all.
- **Suppliers were shown the guest's total as their money.** `supplierShare`
  in pricing.ts recovers the fee from a total (on a stay the fee is not charged on cleaning),
  is tested against every fixture quote, and the payout fixtures now
  state the same net.
- **Hosts read the guest's escrow pill**, "Held until you confirm check-in".
- **Five different RAV4s sat under "this exact vehicle".** Each car now
  shows only frames of one vehicle, and the mosaic lays out 1 to 5 photos
  without padding tiles.
- **Ops saw only some threads.** The concierge is now a participant in every
  thread, which is how the repo models "ops sees everything"; admin reads
  as ops.

The rest: checkout gained the missing card and contact fields and a
lane-correct step spine; the lease page stopped using nightly copy; the map
view uses stacked cards; neighbourhood pages use maps instead of interior
photos; the queue's tab counts agree with its stats and rows open a
read-only record; the header carries the role's own screens and a sign-in;
stale inspection and queue dates were brought up to November.

Then, the same day: landmark labels give way to price pins (other side,
else a bare diamond) and use proper names from `landmarkNames`; the owner
band on a lease shows the monthly rent and the free-from date; the preview
controls moved into the phone menu, because no corner of a phone is free of
card CTAs. A matched car photo set still needs a real shoot; the shot list
is in `public/images/README.md`. Price pins can still overlap each other
where listings cluster.
