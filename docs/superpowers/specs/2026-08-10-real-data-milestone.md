# Real data milestone: the same screens, on Postgres

**Status:** paused behind `2026-11-03-search-and-polish-design.md`. Steps 1
and 3 are done, step 2 is half done. Written 2026-08-09.

## Why this milestone exists

The UI milestone finished. Every journey in `docs/02-product-and-ux` §5 has been
walked in a browser, in every role, at two widths, in both themes — twice. The
screens are no longer a guess.

This one makes them real, and deliberately makes nothing new. When it is done a
guest signs in with an actual account, sees their actual bookings, and cannot
see anybody else's — and no screen has moved. That is the whole point of the
order the build took: `src/lib/repos/index.ts` is one function returning a
`Repositories` object, and this milestone adds a second implementation of the
same interfaces and flips it.

## Scope, and what is deliberately not in it

Technical Plan §11 lists Phase 0b as identity, payments core, messaging core
with realtime, and the data layer under the concierge tooling. That is three
subsystems, and shipping them together would mean nothing is verifiable until
all of it lands.

**This milestone is only the data layer and identity.** Payments core and
realtime messaging each get their own, after. The boundary is chosen so the
milestone produces something honest on its own: existing screens, real rows,
real sign-in, nothing else different.

## Ground rules

- **Everything local runs in Docker.** No Postgres on the host, no "works on my
  machine" Node version. See step 2.
- **No screen may move.** If a page needs changing to accommodate the database,
  that is a finding about the schema, not a licence to redesign. Write it down.
  The surfaces were argued about on purpose.
- **The seam holds.** No screen imports Supabase. `repos()` stays the only place
  that knows where a row comes from, and `Repositories` stays the contract.
- **RLS is not optional and not a later pass.** Every table gets a policy in the
  same migration that creates it. A table that is readable before its policy
  exists has been readable, and "we will add policies at the end" is how that
  happens.
- **Verification changes medium.** Up to now the house rule has been "look at it
  in a browser". A ledger, a row-level security policy and an escrow release are
  not things you look at — they are things you assert. Hence step 3.

## Steps

Tick these off and commit the tick with the work.

- [x] **1. Merge the UI milestone.** Done: as of 2026-11-03 `main` and
      `ui-milestone` point at the same commit.
      `ui-milestone` is 23 commits ahead of `main` and has never been merged or
      opened as a PR. It only grows, and every day it sits there the merge gets
      worse. Do this before writing a line of anything else.

- [ ] **2. The local stack, in containers.** Half done 2026-11-03:
      `compose.yaml` and the `Makefile` run the web app and Meilisearch, with the
      named `node_modules` volume, `WATCHPACK_POLLING` and port 3100. The
      Supabase CLI stack, and moving the web service onto its network, are
      still to do.
      Supabase CLI orchestrates its own stack; a `compose.yaml` adds our
      workloads to its network. `duda-dodo/` on this machine already runs
      exactly this shape and has paid for several lessons — copy them rather
      than rediscover them:
      - **`node_modules` lives in a named volume, not the bind mount.**
        Installing tens of thousands of small files across a macOS bind mount is
        pathologically slow. Source stays bind-mounted so host edits are live.
      - **Containers are held warm with `sleep infinity` and driven by
        `docker compose exec`**, never `run`. A container per command is what
        makes container-based test loops painful.
      - **The web service does not get the service-role key.** It bypasses RLS
        entirely and has no business inside a process that renders pages. Pass
        it only to the runner that needs it.
      - **In-network and host URLs differ.** Server code reaches Kong at
        `http://supabase_kong_homelink:8000`; the browser cannot resolve
        container names, so anything reaching the browser needs `127.0.0.1`.
        Getting this wrong produces errors that look like auth failures.
      - **`WATCHPACK_POLLING=true`**, or Turbopack will not see edits across the
        bind mount.
      - **Pick a port band that does not collide.** duda-dodo holds 55321–55329
        and 4000, and host 3000 is occupied. Take 55421–55429 and 3100, so both
        projects can run at once — they will need to, because this repo's
        conventions keep getting compared against that one.

      A `./dc`-style wrapper is worth stealing too. It is the difference between
      a documented workflow and one that lives in somebody's shell history.

- [x] **3. A test runner, and the first test.** Done 2026-11-03: Vitest,
      with `paginate`, `parseRole` and `quoteStay` covered, plus the search
      parser. Runs with `make test` or `make host-test`.
      There is no test infrastructure at all: four dependencies, no runner, no
      test files. That was survivable while every claim could be checked with a
      screenshot. It stops being survivable here — the first thing this
      milestone builds is row-level security, and you cannot photograph a policy.
      Add a runner inside the container, and prove it works against something
      that already exists and is pure: `paginate` clamps an out-of-range page,
      `quoteStay` gets RWF arithmetic right, `parseRole` refuses a cookie it
      does not recognise. Do not port a repo until a test can fail.

- [ ] **4. Schema and RLS.**
      The front end has already decided most of this; see the section below,
      which lists the tables, the column types the domain types force, and the
      queries that must stay possible. Write the policies in the same migrations.

- [ ] **5. Identity, and the role claim.**
      `lib/preferences/role.ts` is already the single place role is resolved,
      and it already documents that the cookie becomes an auth claim with
      nothing above it changing. Make that true. The preview bar's role switcher
      is development-only and should stop working against a real session rather
      than silently mislead.

- [ ] **6. `supabaseRepositories`, one repo at a time.**
      Add `src/lib/repos/supabase/` exporting an object satisfying
      `Repositories`. Port in dependency order — stays, mobility, experiences,
      then bookings, trips, messaging, ops — and keep the fixtures working
      behind an env switch until the last one lands, so a half-ported branch is
      still runnable. Every method already has a signature and a docstring
      saying what it must not leak; those are the spec.

- [ ] **7. Flip `repos()`, and walk it again.**
      The same sweep as milestone step 7: every route, both widths, both themes,
      each role. The screens should be indistinguishable from today. Anything
      that moved is a bug in the port, not a redesign — that is the entire
      value of not having touched them.

## What the front end already decides for you

None of this needs designing. It is readable off `src/lib/domain/types.ts` and
`src/lib/repos/types.ts`, and disagreeing with it means changing a screen.

### Tables

`listings`, `vehicles`, `experiences`, `verification_records`, `bookings`,
`trips` + `trip_bookings`, `conversations` + `conversation_participants`,
`messages` + `message_attachments` + `message_reads`, `verification_tasks`,
`addon_requests`, `payouts`, `fx_rates`.

Three of those joins exist because of a specific screen:

- **`trip_bookings`** — `Trip.bookingIds` is an array, and a booking can belong
  to no trip. `/trips` renders bookings and paints a trip name on the rows it
  covers; the cancelled Corolla hire belongs to no trip and must still appear.
- **`conversation_participants`** — a booking carries more than one thread and
  participants are *roles*. The guest talks to the concierge; the concierge
  talks to the host; neither may open the other's. This is the read policy.
- **`message_reads`** — unread is a fact about a reader. Two people looking at
  one thread do not have the same count, so it is a join, not a column.

### Column types the domain forces

- **Money is two columns, never one.** Every `Money` is an integer count of
  minor units plus an ISO 4217 code. Not `numeric`, not `money`, not a float.
  RWF is zero-decimal, which is why `lib/domain/money.ts` exists at all — a
  `minor / 100` anywhere renders RWF 165,000 as 1,650.
- **`date` and `timestamptz` are not interchangeable, and the codebase already
  says which is which.** `lib/domain/dates.ts` argues that a check-in date is a
  calendar date with no timezone; `lib/domain/instants.ts` argues that a message
  was sent at an instant. So `bookings.start_date`, `end_date`,
  `verification_records.inspected_at`, `payouts.release_on` are `date`; and
  `messages.sent_at`, `message_reads.read_at`, `conversations.last_message_at`
  are `timestamptz`. Two modules exist to keep those apart; two column types
  should too.
- **Ordered arrays stay ordered.** `Listing.images[0]` is the hero and the
  gallery mosaic depends on the order. Either an array column or a table with an
  explicit position — not a set.
- **Enum-ish arrays are filtered by containment.** `amenities`, `modes`,
  `driveModes`, `interests` are all filtered with "has all of these" in
  `stays.list` / `mobility.list` / `experiences.list`. `text[]` with a GIN index
  and `@>` is the straightforward answer; a join table means the "every amenity"
  filter becomes a `group by … having count(*)`.

### Queries that must remain possible

- `stays.list` filters on neighbourhood (**contains**, not equals — the field is
  a free-text combobox, so "kacy" finds Kacyiru), min bedrooms, min sleeps, all
  of N amenities, lease band, and sorts by price, size, or recency of
  verification.
- `neighbourhoodsWithCounts()` is a `group by` with counts, because a suggestion
  that says how much is behind it is honest about thin inventory.
- `bookings.byReference` is **case-insensitive**. The code is printed in caps
  and will be typed in both, so it wants a unique index on `upper(reference)`.
- `messaging.forRole(role)` — there is deliberately no unscoped
  "list all conversations" on the interface. Ops sees everything by being in
  everything. Do not add one in SQL either.
- `ops.*` has no per-user scoping at all and is the only place that is true, so
  those three policies key off the role claim rather than ownership.

## Decisions already taken

- **Phase numbers stay.** 0a is the surfaces, 0b is the foundations. Several
  dozen code comments say "Phase 2 replaces this with a live feed"; renumbering
  buys a tidier list and invalidates all of them.
- **The fixtures do not get deleted.** They are the reference implementation of
  every interface and the only thing that makes the app runnable without a
  database — including in CI, and including for anyone who just wants to look at
  a screen. Keep them behind the switch.

## Decisions that are now cheap, and were not

- **The theme flash cookie.** Deferred through the whole UI milestone because
  `cookies()` opts a route out of static rendering and the landing page and
  experience detail page were the cost. Auth means those two pages are reading
  a cookie regardless, so most of that cost has already been paid. Decide it
  here, with a caching strategy in front of you — the argument is written up in
  `2026-08-09-ui-milestone.md` under "Open decision".

- **`en` is tagged `en-US`** while every word of the copy is British —
  "neighbourhood", "saloon", "tarmac" — so dates read "November 14, 2026".
  Message *times* were already pinned to a 24-hour clock on exactly this
  argument (`lib/domain/instants.ts`). The date format is the same argument at
  wider blast radius. It is a one-line change and a whole-site visual diff, so
  do it at the start of a session, not the end.

## Carried forward, not blocking

- **Fixture thinness.** Every listing carries both `nightly` and `lease`, so the
  Renting filter removes nothing. It is why the lane's pricing bug stayed
  invisible until the journey was walked. Real data ends this.
- **~130 Kinyarwanda strings across nine message groups** were written by the
  assistant, not a native speaker. They should be read by one before anybody
  outside the team sees the product.
- **No ownership model.** A supply lane shows everything HomeLink has verified
  in it, and `/inventory` says so in a caption. Real supplier accounts end this,
  and step 4 is where the join gets designed.
- **The supplier edit form.** `SupplyOwnerBand` is informational: it says rates
  and photographs are changed by the Kigali team, which is true in V1 per §9
  fast-follow #4. When owner onboarding comes online this is where the form goes.

## What "done" means

`docker compose up` and one command gets a working stack. A guest signs in,
`/trips` lists their own bookings from Postgres, `/queue` refuses them, a host
cannot open the guest's thread, and a full sweep is visually identical to the
fixtures build. No new screen, no moved screen.

## Then what

Payments core and the ledger, then messaging realtime — each its own milestone,
each against surfaces that already exist. After that, Phase 1 in the roadmap is
what it always said it was.
