# UI milestone: prove the journeys before building the backend

**Status:** complete. Started and finished 2026-08-09.

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
- [x] **4. Supply dashboard — "my inventory".**
      One shell serving host, driver and guide. Their journey has the same
      shape: I list a thing, it gets booked, I get paid. The noun and two
      columns change; the layout does not. If a real difference shows up while
      building, note it here rather than forking the page on a hunch.
      *No difference between the three roles turned up.* The noun changes, and
      the two columns are "what the thing is" (bedrooms / gearbox / hours) and
      "what it earns" (per night / per day / per person). Everything else —
      section order, booking rows, the money panel — is identical, so the
      decision to build one shell holds.
      Two gaps found while building, both worth a look in step 7 rather than a
      fix on a hunch. The supply side shows no cancellations, where the guest
      side lists them under "Earlier"; money that did not arrive is arguably
      the thing a supplier notices most. And there is no ownership model, so
      every verified item in a lane appears — the page says so plainly rather
      than implying one host owns Kigali.
- [x] **5. Concierge ops shell — "the queue".**
      Verification queue, manual add-on requests, all threads, payouts. This is
      the tool that delivers the guarantee the whole product rests on
      (`docs/02-product-and-ux` §7).
- [x] **6. Messaging shell.**
      `/messages` currently renders `NotBuiltYet`. Threads scoped to a booking,
      guest / supply / concierge participants, read state. Per §8 this is
      load-bearing, not an add-on.
      *Built before step 5*, because the ops queue lists "all threads" and
      would otherwise have been written against a screen that did not exist.
      One thing the fixtures made obvious once written down: a booking carries
      more than one thread. The guest talks to the concierge, and the concierge
      talks to the host, about the same night in the same flat — so threads
      carry participant *roles* and a host can never open the guest's thread.
- [x] **7. Physical review sweep in the browser.**
      Walk all four journeys from `docs/02-product-and-ux` §5 end to end, in
      each role, both themes, desktop and mobile. Write down what is wrong
      before fixing any of it. *Findings are in the section below.*
- [x] **8. Rewrite the roadmap.**
      Update `docs/02-product-and-ux` §10 and `docs/03-technical-plan` §11 to
      describe the real sequence, including this milestone. Both currently claim
      a foundations-first order the build has not followed.
      *Phase numbers were kept and Phase 0 was split into 0a (surfaces, done)
      and 0b (foundations).* Renumbering would have invalidated several dozen
      "Phase 1 / Phase 2" references in code comments that are load-bearing
      documentation in their own right, to buy nothing but a tidier list.

## Sweep findings, 2026-08-09

Eighteen routes at 1280 and 390, light and dark, each seen as the role that
would actually be on it. Written down before anything was touched.

### Wrong

1. **The checkout calls a car a stay.** The summary panel on `/cars/…/book`
   and `/experiences/…/book` is headed "Your stay", and both pages say "This
   stay is below our escrow threshold". `checkout.yourStay` and
   `checkout.noEscrowBody` were written for one lane and reused in three. The
   verification panel already solved this with kind-aware copy; the checkout
   did not follow. **Fixed** the same way: stay copy is the default and the
   other two lanes override it.

2. **The Renting lane is Stays with a chip on.** `/stays?band=long` shows the
   same six places at the same nightly prices. `ListingRow` always renders
   `perNight`, so the one thing that distinguishes a lease from a booking —
   that it is priced by the month — is invisible in the lane built for it. The
   tab, the key icon and the whole §5-C journey currently change nothing a
   user can see. **Fixed.** The lane prices by the month, offers "Apply for a
   lease" rather than "Reserve", and drops the three things that only mean
   something to a nightly booking: the date prompt, the escrow badge, and
   "2 left for these dates".

3. **`/trips` does not check who is asking.** `/inventory` and `/queue` read
   the role cookie and decline politely. `/trips` does not, so a host or an
   ops user landing on it sees the guest's bookings, and the rows hard-code
   `"guest"` when they look up the thread. Nothing is exposed that a fixture
   does not already publish, but it is the wrong shape to carry into auth.
   **Fixed**: same check, same polite refusal, and the thread lookup uses the
   viewer's role rather than a hard-coded `"guest"`.

4. **`/trip/start` is dead.** It renders `NotBuiltYet` and nothing in `src`
   links to it. It predates the tab strip, which replaced the intent doors it
   was the target of. **Deleted.** `7dc6f0d` removed the doors outright and
   this was the door's destination; the Trip concept itself lives on in
   `/trips` and in the grouping on a booking row.

### Not wrong, but worth recording

5. **Not fixed.** All six fixture listings carry both `nightly` and `lease`, so the band
   filter removes nothing. Fixture thinness rather than a bug, but it is why
   finding 2 was invisible until the lane was walked.

6. **Not fixed, deliberately.** `en` is tagged `en-US` for formatting while every word of the copy is
   British — "neighbourhood", "saloon", "tarmac". Dates therefore read
   "November 14, 2026". Message times were pinned to a 24-hour clock in step 6
   for exactly this reason; the date format is the same argument and a wider
   change, so it is left for a deliberate decision rather than folded into a
   sweep.

### Not the product — measuring mistakes, recorded so the next sweep skips them

7. Headless Chrome on macOS will not open a window narrower than about 500px.
   `--window-size=390,…` lays the page out wider and crops the screenshot,
   which reads exactly like horizontal overflow on every page. Render inside a
   same-origin iframe of an exact width instead.

8. `next build` does not clear `.next/cache/images`. Replace a file under
   `public/` and the optimiser still serves the previous variant, so a
   screenshot taken to verify a swap shows the image you just deleted.

9. A measuring harness that takes a URL in its own query string has to encode
   it. Unencoded, everything after the first `&` was eaten, which produced one
   404 and three checkout pages that had quietly redirected back to their
   detail page. The screenshots were right; the URLs were wrong.

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
