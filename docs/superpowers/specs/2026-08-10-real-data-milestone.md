# Real data milestone: the same screens, on Postgres

**Status:** not started. Written 2026-08-09, for the session after.

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
  not things you look at — they are things you assert. Hence step 2.

## Steps

Tick these off and commit the tick with the work.

- [ ] **1. Merge the UI milestone.**
      `ui-milestone` is 23 commits ahead of `main` and has never been merged or
      opened as a PR. It only grows, and every day it sits there the merge gets
      worse. Do this before writing a line of anything else.

- [ ] **2. A test runner, and the first test.**
      There is no test infrastructure at all: four dependencies, no runner, no
      test files. That was survivable while every claim could be checked with a
      screenshot. It stops being survivable here — the first thing this
      milestone builds is row-level security, and you cannot photograph a policy.
      Add a runner, and prove it works by testing something that already exists
      and is pure: `paginate` clamps an out-of-range page, `quoteStay` gets RWF
      arithmetic right, `parseRole` refuses a cookie it does not recognise.
      Do not port the repos until a test can fail.

- [ ] **3. Schema and RLS, written against what 0a found.**
      Technical Plan §11 lists four consequences the UI work turned up, and each
      is a schema decision rather than a screen decision:
      - a booking carries **more than one thread**, and participants are roles —
        so `conversation_participants` is a table and the read policy keys off
        it. A host must not be able to select the guest's thread.
      - **unread is per reader**, so it is a join against read receipts, not a
        counter column. Two people looking at one thread do not have the same
        number.
      - supply is reachable **by id as well as by slug**, because that is what
        `bookings.supply_item_id` holds.
      - a **verification candidate is not a listing**. Keep them separate
        tables; a half-populated `listing` is one boolean away from going live.

- [ ] **4. Identity, and the role claim.**
      `lib/preferences/role.ts` is already the single place role is resolved,
      and it already documents that the cookie becomes an auth claim with
      nothing above it changing. Make that true. The preview bar's role switcher
      is development-only and should stop working against a real session rather
      than silently mislead.

- [ ] **5. `supabaseRepositories`, one repo at a time.**
      Add `src/lib/repos/supabase/` exporting an object satisfying
      `Repositories`. Port in dependency order — stays, mobility, experiences,
      then bookings, trips, messaging, ops — and keep the fixtures working
      behind an env switch until the last one lands, so a half-ported branch is
      still runnable. Every method already has a signature and a docstring
      saying what it must not leak; those are the spec.

- [ ] **6. Flip `repos()`, and walk it again.**
      The same sweep as milestone step 7: every route, both widths, both themes,
      each role. The screens should be indistinguishable from today. Anything
      that moved is a bug in the port, not a redesign — that is the entire
      value of not having touched them.

## Decisions already taken

- **Phase numbers stay.** 0a is the surfaces, 0b is the foundations. Several
  dozen code comments say "Phase 2 replaces this with a live feed"; renumbering
  buys a tidier list and invalidates all of them.
- **The fixtures do not get deleted.** They are the reference implementation of
  every interface and the only thing that makes the app runnable without a
  database. Keep them behind the switch.

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
  and step 3 is where the join gets designed.
- **The supplier edit form.** `SupplyOwnerBand` is informational: it says rates
  and photographs are changed by the Kigali team, which is true in V1 per §9
  fast-follow #4. When owner onboarding comes online this is where the form goes.

## What "done" means

A guest signs in, `/trips` lists their own bookings from Postgres, `/queue`
refuses them, a host cannot open the guest's thread, and a full sweep is
visually identical to the fixtures build. No new screen, no moved screen.

## Then what

Payments core and the ledger, then messaging realtime — each its own milestone,
each against surfaces that already exist. After that, Phase 1 in the roadmap is
what it always said it was.
