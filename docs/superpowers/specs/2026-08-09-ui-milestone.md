# UI milestone: prove the journeys before building the backend

**Status:** in progress. Started 2026-08-09.

## Why this milestone exists

The documented roadmap (`docs/03-technical-plan` §11) puts foundations first:
identity, payments core, messaging core, then Stays. The build has not followed
that. What exists is the front end for most of Phase 1's surfaces — Stays,
Mobility and Experiences all browsable and bookable — sitting on fixtures, with
none of Phase 0's foundations.

That divergence is deliberate and is worth finishing rather than abandoning
halfway. Walking every journey in a real browser is the cheapest way to find out
which screens the product actually needs, and it is far cheaper to discover that
now than after a schema has hardened around a guess. The backend then gets built
against surfaces that have been seen and argued about, not imagined.

The last step of this milestone is rewriting the roadmap so the documents
describe the sequence the team is really following.

## Ground rules while this milestone runs

- **Fixtures only.** No Supabase, no auth, no payment provider, no realtime.
  `src/lib/repos/index.ts` stays the single swap point; new screens read through
  `repos()` like every existing one.
- **Shells, not systems.** A dashboard here is a laid-out screen with real
  fixture data in it. It does not need to write anything.
- **Style is the deliverable.** The point is a coherent visual language across
  every lane and role. Where a new screen needs a pattern that already exists,
  reuse the component rather than restating it.
- **Look at it in a browser.** Headless screenshots at 1280 and 390, light and
  dark. Measure rather than assume; the header work in `e9b43ed` was off by 6px
  in two places until it was measured.

## Steps

Tick these off and commit the tick with the work.

- [x] **1. Polish parity for cars and experiences.**
      The stays detail page carries `VerifiedBadge` in the title block,
      `InspectorRow`, and `Highlights`. Cars and experiences have none of the
      three. Bring them up to the same standard without making three pages that
      merely look identical — a car and a trek earn different facts.
- [x] **2. Car photography.**
      `vehicle-4.jpg` is a white Honda CR-V on Icelandic snow captioned as a
      Land Cruiser for the parks. Each vehicle has one image, so four of five
      mosaic tiles fall back to gradient. Same treatment the experiences got in
      `5f9eb13`: five frames each, looked at before committing, IDs recorded in
      `public/images/README.md`.
- [x] **3. Guest dashboard — "my trips".**
      Upcoming and past bookings, references, escrow state, link into the
      thread, the concierge add-on offer that already lives on the confirmation
      screen.
- [ ] **4. Supply dashboard — "my inventory".**
      One shell serving host, driver and guide. Their journey has the same
      shape: I list a thing, it gets booked, I get paid. The noun and two
      columns change; the layout does not. If a real difference shows up while
      building, note it here rather than forking the page on a hunch.
- [ ] **5. Concierge ops shell — "the queue".**
      Verification queue, manual add-on requests, all threads, payouts. This is
      the tool that delivers the guarantee the whole product rests on
      (`docs/02-product-and-ux` §7).
- [ ] **6. Messaging shell.**
      `/messages` currently renders `NotBuiltYet`. Threads scoped to a booking,
      guest / supply / concierge participants, read state. Per §8 this is
      load-bearing, not an add-on.
- [ ] **7. Physical review sweep in the browser.**
      Walk all four journeys from `docs/02-product-and-ux` §5 end to end, in
      each role, both themes, desktop and mobile. Write down what is wrong
      before fixing any of it.
- [ ] **8. Rewrite the roadmap.**
      Update `docs/02-product-and-ux` §10 and `docs/03-technical-plan` §11 to
      describe the real sequence, including this milestone. Both currently claim
      a foundations-first order the build has not followed.

## Decisions already taken

- **Three dashboards, not five or seven.** Host, driver and guide share one
  Supply shell. Building three near-identical screens teaches the same lesson
  three times and hardens accidental differences before anyone knows which are
  real. Admin is deferred: it has no journey in the docs. Visitor is the
  signed-out site, not a dashboard.
- **Supply-side screens are built even though V1 inventory is concierge-only.**
  §9 fast-follow #4 says owner onboarding runs offline at first. The shell is
  still worth having now, because it is what tells us whether the offline
  process is hiding a screen the team will need on day one.

## Open decision: the theme flash script

`ThemeScript` renders a bare inline `<script>` in the document head, and Next
warns in development that scripts inside React components never execute on a
client render.

The warning stands. It is not a bug and the obvious fix makes things worse:
`next/script` with `beforeInteractive` emits `self.__next_s.push(...)` rather
than an inline script, and Next's runtime chunks are all `async`, so the header
markup streams more than a kilobyte ahead of that queue being drained. Measured
against the served HTML: the page would paint in the OS theme and then snap.
That is the flash the component exists to prevent.

The real fix is to stop needing a script. Persist the theme in a cookie, read it
in the layout, and put `data-theme` on `<html>` from the server. No script, no
flash, no warning.

It is not a free cleanup. `cookies()` opts every route out of static rendering,
and this codebase deliberately protects that — the header wraps `VerticalTabs`
in a Suspense boundary for no reason other than keeping `useSearchParams` from
doing exactly that. Nine of thirteen pages already take `searchParams` and are
dynamic anyway, so the real cost is the landing page and the experience detail
page.

Decide it deliberately, ideally alongside the backend work, when there is a
caching strategy to weigh it against. Until then the warning is noise and the
comment in `theme-script.tsx` explains why, so nobody quietly "fixes" it back
into a flash.

## Then what

Backend and database, against surfaces that have been walked rather than
guessed. The seam is already in place: add `src/lib/repos/supabase/` exporting a
`supabaseRepositories` that satisfies `Repositories`, and switch `repos()`.
