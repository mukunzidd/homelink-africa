# Booking, workspace and notifications: the whole product, on fixtures

**Status:** built through Task 47 of
`docs/superpowers/plans/2026-11-08-booking-workspace.md`, swept and fixed on
2026-11-09 (see "Review and fixes"). The whole-branch review has not run yet.
Approved in outline 2026-11-08.

## Why this exists

The owner looked at the booking flow and called it a demo: three steps, one pay
form, a confirmation rebuilt from the query string, and nothing a guest can do
afterwards. They asked for it to be fully featured, for a proper dashboard per
kind of user, for the navigation to be rethought (including whether a sidebar
belongs anywhere), for in-app notifications, and for "everything" around those.
UI only, on fixtures, the way the last two passes were built.

Like the search and polish pass, this one moves screens, so it lands before the
paused real-data milestone (`2026-08-10-real-data-milestone.md`). The Postgres
port then diffs against these screens. That milestone stays paused, not dropped.

## Decisions taken by the owner

- **HomeLink is the only host.** The `host` role is removed. Everything a host
  could do, and everything property management needs, goes to `admin`.
- **The plan as listed on 2026-11-08 is sound**, in this order: workspace shell
  and roles, notifications, booking flow, dashboards, settings and sign-in.
- **A trip cart exists, off by default.** Someone booking one thing never sees
  it. A clear call to action turns it on for someone who wants a stay, a car
  and a day out paid together.
- **No "lease" in the copy.** Rwandans use the word less and less. Visible text
  says "renting" or "long-term stay", and the contract is a "rental agreement".
- **Four languages:** English, French, Kinyarwanda and Swahili, for every
  string, on every new and existing screen.

## Calls made by the builder (check these)

- **Roles after this pass:** `visitor`, `guest`, `driver`, `guide`, `ops`,
  `admin`. Drivers and guides stay outside partners with their own screens; the
  owner did not say otherwise. Finance and property management are not separate
  roles: they are admin's.
- **A stale `homelink.role=host` cookie reads as `visitor`, not `admin`.**
  Mapping a retired role to the most powerful one is the habit that becomes a
  privilege escalation once the cookie is a real claim.
- **Staff and partners work in a separate workspace at `/{locale}/manage/...`**
  with a sidebar and no public header. The public site and the guest's account
  keep the top bar. A sidebar on a consumer site reads as an office tool, and
  people use the public site a few minutes a month; staff use the workspace all
  day across twenty-odd sections.
- **Guest account pages get a left section menu**, the way Airbnb does
  settings. It is a menu inside the page, not an app sidebar.
- **Code identifiers keep `lease`** (`StayMode = "lease"`, `LeaseTerms`, the
  `lease` message namespace). Only text a person reads changes. Renaming the
  types touches every fixture and several dozen comments for no reader's
  benefit. The search parser keeps "lease" as an input word, because people
  will still type it.
- **French copy says "location longue durée"**, not "bail", for the same reason
  as English. Kinyarwanda and Swahili equivalents are written by the assistant.
- **Swahili uses `sw-RW` for dates and numbers.** Node 22 resolves it and
  prints `RWF 165,000` and `9 Novemba 2026`, measured 2026-11-08; the plan
  re-checks it in Chrome, since server and browser ICU have disagreed here
  before. Swahili readers get the `abroad` segment defaults, on the guess that most are
  visitors from Kenya, Tanzania and Uganda.
- **Writes are real, in memory.** Booking, cancelling, marking read and editing
  a listing go through new repo methods, called from server actions, that
  mutate a module-level fixture store. State survives navigation and resets on
  a server restart. Phase 2 swaps the store for Supabase behind the same repo
  types. The alternative, keeping everything in the query string or
  localStorage, cannot show an ops screen a booking a guest just made.
- **The server recomputes every price.** A placed booking's total comes from
  the listing, the dates, the extras and the promo code, never from the
  client's number.
- **Payment is simulated with test numbers**, the way Stripe's test mode works,
  so every state can be demonstrated: card `4242 4242 4242 4242` approves,
  `4000 0000 0000 0002` declines, `4000 0027 6000 3184` asks for a 3-D Secure
  check. A Mobile Money number ending `0000` times out, ending `1111` is
  declined, anything else approves after the guest "approves on the phone".
- **Escrow is reworded, not removed.** With HomeLink as host the promise
  becomes: on high-value stays the payment stays refundable and is not counted
  as HomeLink's until someone from the team confirms you are inside. The
  threshold (`ESCROW_THRESHOLD_RWF`, 300,000) stays. Payouts exist only for
  drivers and guides.
- **Listings say "Hosted by HomeLink"** and name the property manager. The
  supplier band ("your own listing") becomes an admin band linking to the
  listing editor.
- **Realtime is simulated.** The bell polls an unread count every 30 seconds,
  and the preview bar can fire a test event. Phase 2 replaces the poll with
  Supabase Realtime.
- **Prices for extras, the promo code and policy windows** below are
  placeholders in fixtures, editable from the admin settings screen.
- **No new runtime dependencies.** Charts are inline SVG, uploads are
  client-only previews, the receipt is a print stylesheet, the calendar file is
  generated by hand.

## Roles and what each one sees

| Role | Where they land | What they have |
| --- | --- | --- |
| visitor | public site | browse, search, save, sign in |
| guest | public site, `/account` | bookings, trips, renting, viewings, payments, settings, notifications |
| driver, guide | `/manage/jobs` | jobs, schedule, earnings, documents, inbox |
| ops | `/manage/today` | today board, bookings, asks, inspections, housekeeping, maintenance, incidents, inbox, calendar (read) |
| admin | `/manage/overview` | everything ops has, plus portfolio, listing editor, calendar and rates, tenants, homes for sale, partners, finance, people, content, settings, audit log |

## Booking flow

Six steps, one shape across lanes; the content differs.

1. **Dates and party** (on the detail page, as today).
2. **Your details:** sign in, create an account, or continue as a guest; booking
   for someone else; arrival time; trip purpose; special requests.
3. **Extras:** airport pickup, early check-in, late checkout, groceries on
   arrival, a cot, mid-stay cleaning. Cars: child seat, full insurance. Days
   out: none at launch.
4. **Review:** house rules to accept, cancellation policy in this booking's
   dates, full breakdown, promo code.
5. **Pay:** card or MTN / Airtel Mobile Money; bank transfer for long-term
   stays; full payment or a 30% deposit where allowed.
6. **Confirmation**, then the booking page from then on.

Lane differences:

- **Long-term stay (renting):** details, application (occupants, employer,
  income band, ID upload), review, rental agreement (scroll, typed signature,
  checkbox), pay deposit and first month, move-in checklist.
- **Car:** with or without driver; pickup point (airport, hotel, address);
  flight number; licence upload for self-drive.
- **Day out:** time slot; each person's name and age, plus passport number and
  nationality where a permit is needed (gorilla trek); pickup point; dietary
  needs.
- **Home for sale:** a viewing request, in person or by video, on a slot
  Monday to Saturday 09:00 to 17:00 Kigali time.

States the flow must show: dates held for 15 minutes with a visible timer and
an expired screen; dates taken while booking; price changed; payment declined,
timed out, or challenged; draft restored after a refresh.

After booking: timeline; change dates with the price difference; add guests;
cancel with a refund preview; receipt and invoice to print; add to calendar;
share; check-in details released 48 hours before arrival; online check-in with
ID; report a problem, ask for something, or extend during the stay; review and
book again afterwards; deposit refund status for long-term stays.

### Policies (placeholders, editable)

- Nightly stay: full refund 7 or more days before arrival; 50% of the
  accommodation line from 6 days to 1 day before (cleaning refunded, service
  fee not); nothing on or after the arrival day. Days count in Kigali time.
- Car: free until 48 hours before pickup; one day's hire after that.
- Day out: free until 72 hours before; permit costs never refundable.
- Deposit plan: offered on stays of 28 nights or more, or totals of
  1,000,000 RWF or more, when arrival is at least 14 days away. 30% now, balance
  14 days before arrival.
- Promo `KARIBU10`: 10% off the accommodation line, capped at 50,000 RWF.

### Extras (placeholder prices, RWF)

| Key | Lane | Price | Unit |
| --- | --- | --- | --- |
| airportPickup | stay | 25,000 | per booking |
| earlyCheckIn | stay | 20,000 | per booking |
| lateCheckout | stay | 20,000 | per booking |
| groceries | stay | 40,000 | per booking |
| cot | stay | 0 | per booking |
| midStayClean | stay | 15,000 | per visit |
| childSeat | car | 5,000 | per day |
| fullInsurance | car | 15,000 | per day |

## The trip cart

Off by default. Stored on the device until accounts exist.

- **The call to action** sits under Reserve on a stay's booking panel, once
  dates are chosen: "Planning a full trip? Book a car and days out with it."
  The same offer replaces today's suggestion cards on the confirmation page.
- **Turning it on** adds the current stay and goes to `/trip`. From then on the
  header shows a Trip pill with a count, and every detail page shows "Add to
  trip" beside its main button, with dates prefilled from the stay.
- **`/trip`** lists items on a day-by-day timeline, flags problems, and totals
  in the display currency. One checkout takes details once, extras per item,
  one review and one payment, and creates a Trip with its bookings.
- **Checks:** two stays that overlap block checkout; a car outside the stay's
  dates and a day out not during the stay warn without blocking; a date in the
  past blocks.
- **Turning it off** ("Book items one at a time") asks in-page before clearing
  a cart that has items. Already-paid bookings shown in the cart are marked
  Booked and never charged again.

## Notifications

- A bell with an unread count in the site header and the workspace top bar. A
  panel groups Today, Yesterday and Earlier in Kigali time, filters by
  category, marks one or all read, and links to the full list.
- Full pages at `/notifications` and `/manage/notifications`.
- Toasts for events that arrive during a session.
- Preferences: a grid of events against channels (in-app, email, SMS, WhatsApp,
  push), quiet hours defaulting to 22:00 to 07:00, and a push prompt shown only
  when the person asks for push.
- Events, by role: guests get booking confirmed, payment received or failed,
  Mobile Money pending, check-in details ready, rent due, message, review
  request, viewing confirmed. Staff get new booking, arrival today, failed
  payment, new ask, new incident, inspection due. Partners get new job, job
  changed, payout sent, document expiring.

## Navigation

- **Site header:** unchanged lanes and search; the bell; the Trip pill when the
  cart is on; the account menu gains My HomeLink, Notifications and, for staff
  and partners, Open workspace.
- **Workspace:** a 248px sidebar with grouped sections, collapsible to a 64px
  icon rail (remembered per device, `[` toggles it); a top bar with search
  (bookings by reference, guests, properties), the bell, a New menu, and for
  admin a property switcher. Below 1024px the sidebar becomes a drawer. Drivers
  and guides get a bottom tab bar below 640px, because they work from a phone.
- **Old routes** `/queue` and `/inventory` redirect to the role's workspace home.

## Non-goals

- No real auth, payments, uploads, email, SMS, WhatsApp or push delivery.
- No owner portal for people whose homes HomeLink runs; the owner did not ask.
- No new runtime dependencies, no map or chart library.

## Review and fixes

Swept on 2026-11-09 with `make e2e` (15 journeys) and `make sweep` (424
screens: guest pages at 390, 1024 and 1440 in light and two of those in dark,
visitor pages, every page in each workspace role's own sidebar, and the
busiest guest and workspace pages in fr, rw and sw). Every capture was looked
at, not only the ones a check flagged. The final run is 15 of 15 journeys and
424 screens with nothing to report.

What it found, and what was done:

- **A guest saw everyone's payments.** `/account/payments` matched all stored
  payments to the guest's bookings for titles, so other guests' payments
  showed under raw IDs and "Paid this year" summed the whole store. Now
  filtered to the guest's bookings, as the privacy export already was. No
  check caught this; it was found by looking at a capture.
- **Kinyarwanda dates broke hydration.** Node formats `rw-RW` from full ICU,
  Chrome has no Kinyarwanda and falls back to English, so every client
  component showing a date re-rendered from scratch. Every date now goes
  through `dateTimeFormat()` in `lib/domain/date-format.ts`, which formats rw
  from en-GB parts and a fixed table of CLDR names. This also changes the
  order: Node gave "2026 Ukwakira 12", which an older comment called the
  wanted form; it now reads "12 Ukwakira 2026". A native reader should
  confirm which Rwandans expect.
- **Long rw and sw labels widened whole pages** (441px and 413px at 390). The
  page grids had no column template below their breakpoint, so the implicit
  column grew to its content. `grid-cols-1` (minmax(0,1fr) in Tailwind 4) on
  ten pages.
- **Money did not fit stat tiles.** "RWF 3,349,013" needs 204px at 28px; a
  phone tile has 139px. The overview's money tile takes the full row on
  phones; the earnings tiles stack below 640px and go four across only from
  1280px.
- **Francs grouped with a period in rw.** Earnings, jobs and other workspace
  pages printed "RWF 157.096". Fixed inside `formatMoney` and the four direct
  `Intl.NumberFormat` calls; the compact franc figure on sale pages was also
  a hydration mismatch in rw for the same missing-ICU reason as dates.
- **Smaller things.** A review aspect label cut at 1024px; partner document
  rows 36px over the edge; a missing `workspace.homes.doc.vehicleInspection`
  key; one fixture description that said "lease".

Traps a later session would otherwise rediscover:

- **The browser has less ICU than the server.** Anything formatted with `Intl`
  in a client component must give the same string in Chrome as in Node.
  `fr` and `sw` do; `rw` does not. Use `dateTimeFormat()` for dates and
  `numberLocale()` (in `lib/domain/money.ts`) for any `Intl.NumberFormat`.
- **The date locale is the wrong tag for money.** Kinyarwanda's CLDR groups
  thousands with a period ("RWF 157.096"), which reads as a decimal point in
  Rwanda; `NUMBER_LOCALES` exists for this. Several workspace pages passed the
  date locale anyway. `formatMoney` now maps rw to en-RW itself, and the sweep
  flags any franc amount grouped with a period.
- **A page that does not scroll sideways can still clip.** The tile overflow
  never widened the page, so the first sweep missed it. The sweep now also
  flags visible text wider than its own box that is not an ellipsis or a
  scroll area. Its first version flagged screen-reader text and closed menus
  on every page; it now ignores anything that is not visible or narrower than
  8px.
- **Measure the original before fixing.** One offscreen measurement of the
  tile text came back at 109px against the 139px available and nearly
  closed the finding; measuring `scrollWidth` on the real element gave 204.
- **`make e2e` empties `.e2e-results/`**, so the sweep writes to `.sweep/`.

Later the same day, after the copy review and the console pass:

- `e2e/console.e2e.ts` opens every page for each role, opens each menu,
  listbox, calendar, disclosure and tab on it, and does the everyday actions
  (search, save, message, theme, change dates, switch language), failing on
  any console error, uncaught exception or 5xx. It was checked against a
  planted `console.error` and finds 4 to 8 triggers per page. Clean.
- `ALL_LOCALES=1 make sweep` opens every page in fr, rw and sw on a phone
  (682 visits). It found Kinyarwanda relative times and Swahili calendar
  headers coming from runtime ICU data the browser lacks, and one more
  untemplated grid; fixed. See also `docs/translations/`.
- One unexplained server error remains; see "Open issues" below.

Gaps seen during the sweep and left alone are listed under "Open issues".

## Open issues

Everything known to be wrong or unfinished on this branch as of 2026-11-09
(updated after the final review the same day),
most noticeable first. Each says what happens, the evidence, and where to
start. Strike an item through, with the commit, when it is fixed.

### 1. ~~The whole-branch review has not run~~ Done 2026-11-09

A fresh reviewer read the whole branch (52451fb..92debfa) and judged it
"ready to merge: with fixes". The Critical finding (door codes, wifi and
directions sent to every visitor on public listing pages) is fixed in
57cb6d3; the six Important ones (cancel after start, changeDates on a
renting and below the minimum stay, a deposit returned twice, trips
claiming other guests' bookings, day-out capacity per departure) in
7e0ba9a, each with a test that failed first. Rulings and deferred minors
are in the ledger, `.superpowers/sdd/2026-11-08-booking-workspace/progress.md`,
lines starting `Final:`, and below.

### 2. ~~`/api/notifications/unread` sometimes returns 500~~ Cause found: a Next.js dev-server race

- **What was seen:** bursts of 500s, logged as `SyntaxError: Unexpected end
  of JSON input ... page: '/api/notifications/unread'`, during long sweeps
  against the dev server.
- **Cause (found by the final review, reproduced):** in development Next
  rereads its manifests on every route request without caching
  (`node_modules/next/dist/server/route-modules/route-module.js`, around
  line 146, `shouldCache: !this.isDev`). Rendering a page runs
  `generateStaticParams` in the background (the "generate-params" time in
  the request log; `[locale]/layout.tsx` has one), and when the result
  changes the dev server rewrites `.next/dev/prerender-manifest.json` with
  a plain, non-atomic `writeFile` (`next-dev-server.js`, around line 690).
  A request landing between truncate and write parses an empty file.
- **Why it looked random:** the rewrite only happens the first time each
  page pattern and locale is seen after a start, so only long all-language
  sweeps on a fresh server hit it; the poll is simply the most frequent
  route. Reproduced: 104 of 16,398 requests on a just-restarted server, 0
  of 12,099 on the same server warm.
- **Not ours, not in production:** a production build caches the
  manifests and never takes this write path. Nothing to fix in the app. If
  a sweep must be spotless, warm every page in every locale first.

### 3. ~~The bell's poll can restart itself~~ Not a bug

The two requests a workspace page sends on load in development are React
Strict Mode running effects twice (production sends one). The suspected
restart cannot happen: the toaster's `api` is memoised on stable
callbacks (`toaster.tsx`), and `useTranslations` is stable for a locale,
so `onArrive` and `load` never change when a toast shows.

### 3a. Repo methods know the role, not the person

Every booking action takes `(reference, by: Role)`. In the preview any
guest cookie can cancel, change, add guests to, pay rent on, check in or
review any booking by reference. Phase 2 cannot add ownership "behind the
same interface": every such signature gains an actor id together. Ruled
not to change now (there are no accounts); the cost, per the final
review, is larger than the Task 26 ruling said. Also for Phase 2: two
people booking one flat is safe today only because the fixture store has
no I/O between `isFree` and the write; a database needs a constraint or a
lock.

### 3b. ~~Small bugs the final review found~~ Fixed in 87a25ff

Calendar export escaping, unchecked payment rails and extras, the bell's
toast inside a state updater, cancellations notified as new bookings (now
`bookingCancelled`, to ops and admin), the booking draft not resetting on a
new key, and the balance date and two "today"s not following the Kigali
rules. Each has a test that failed first, except the two client hooks, for
which there is no React test renderer in this repo.

### 4. Translations still need native readers

The French, Kinyarwanda and Swahili files were reviewed by model reviewers on
2026-11-09 (367, 280 and 232 strings corrected). Each review's "Still needs
a native reader" list is in `docs/translations/`, with the Kinyarwanda list
the longest. Also for a native eye: rw dates ("12 Ukwakira 2026", day first,
changed from Node's year-first form), rw relative times ("hashize iminota
5") and Swahili weekday abbreviations (Jtt … Jpi), all in
`src/lib/domain/date-format.ts`. The legal pages need a lawyer in each
language.

### 5. ~~Fixture data gaps visible on staff screens~~ Fixed 2026-11-09

The seed now has six months of stays, car hire and day outs
(`seedHistory`, `seedLaneHistory`), so every lane of the finance revenue
table has money in every month. Past cars and day outs all end before
today, so they never take a date someone could book. The audit log opens
on five weeks of entries (`seedAudit`): check-ins and check-outs taken
from the bookings' own timelines, plus the routine staff actions of a
month. Seeded payments are dated when the booking was paid, never in the
future. Tests: `src/lib/repos/fixtures/seed-history.test.ts`.

### 6. ~~Layout and accessibility, small~~ Fixed 2026-11-09

Finance tables stack into one card per row on a phone, the first cell as
the title and every other cell labelled with its column name
(`components/workspace/finance/shared.tsx`). Calendar day buttons use
`aria-pressed`; lint passes with no warnings.

### 7. Working on this branch: traps

- **Restart the web container before a long run** (`docker compose restart
  web`). After hours of sweeps the dev server restarts itself at its memory
  threshold mid-run, and requests in flight fail with empty responses,
  broken chunks or 500s that are not real findings.
- **A route that keeps returning 500 with `SyntaxError: Unexpected
  non-whitespace character after JSON`** means the dev server's
  `.next/dev/prerender-manifest.json` was written twice over itself (the
  race in item 2, made permanent). Delete it inside the container
  (`docker compose exec web rm .next/dev/prerender-manifest.json`) and
  restart web. Seen 2026-11-09 when a new preview route was added.
- **The team preview on Netlify** (https://homelink-preview.netlify.app,
  site homelink-preview, IST-b2c team) logs React error #418 on every
  page. The app is not at fault: Netlify inserts a "This site is hosted
  on Netlify" comment, with line breaks around it, into every page's
  `<head>`. React finds the extra whitespace there, discards the
  server's HTML and renders the page itself, so it looks and works the
  same. Proven 2026-11-09: the same build is clean under `next start`,
  and the live page is clean once the comment and its line breaks are
  removed in the browser. Netlify has no documented switch for it, and
  `built_with_badge_enabled` cannot be changed on the free plan. Deploy
  from a clean worktree of a commit (`npm ci`, then
  `netlify deploy --build --prod`), never from this folder: building
  here deletes the dev container's `.next/dev`.
- **Do not edit files while a sweep runs.** Turbopack reloads modules under
  load and a page can fail with "the module factory is not available".
- **Message edits need a restart** (`docker compose restart web`) before the
  dev server serves them.
- **Folders that are not part of the work:** `undefined/` in the repo root
  holds old screenshots from a scratch script with an unset output path
  (untracked, safe to delete); `.sweep/` and `.e2e-results/` are ignored
  test output.

## Left for later

- French, Kinyarwanda and Swahili copy was model-reviewed and needs native
  readers; see "Open issues" 4.
- Server restarts clear everything written in a session; Phase 2 persists it.
- Booking pages, receipts and calendar files are authorised by the preview's
  role cookie, so anyone holding a reference can open one. There are no
  accounts yet; Phase 2 must check that the booking belongs to the signed-in
  user on every one of them (raised by the automated security review).
