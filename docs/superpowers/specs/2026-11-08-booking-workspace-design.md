# Booking, workspace and notifications: the whole product, on fixtures

**Status:** approved in outline 2026-11-08, plan at
`docs/superpowers/plans/2026-11-08-booking-workspace.md`. Written 2026-11-08.

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

## Left for later

- Kinyarwanda and Swahili copy is assistant-written and needs native readers.
- Server restarts clear everything written in a session; Phase 2 persists it.
