# HomeLink: Product & UX Definition

*What the platform is, how it's composed, and how each kind of person moves through it.*

**Date:** 2026-07-20 · **Stage:** Pre-build brainstorm · **Status:** Draft for team review
**Companion documents:** Lean Canvas (summary and detailed) · Technical Plan

---

## 1. Product Principles

The rules every screen, flow, and service obeys.

1. **Intent over inventory.** We route people by *why they came*, then show inventory. We never force a funnel.
2. **Booking is atomic; the Trip is optional.** A single-service booking (a local renting an apartment, someone just grabbing a car) is a straight book then pay, with no "Trip" framing. A **Trip**, a grouping of bookings into one itinerary, appears only when the intent is to compose a journey (the diaspora or tourist arrival bundle).
3. **Bundle is gravity, not a gate.** Add-ons (car, tour) pull toward a richer Trip but never block a booking. They're dismissible and can be added later.
4. **Segment-native by default, overridable always.** Language, currency, payment rail, content emphasis, and the default flow adapt to who you appear to be, and the user can always override.
5. **Guaranteed, not just listed.** If it's on HomeLink, we've verified it and we stand behind it. Trust is the product.

---

## 2. Service Architecture: "separate services that link"

HomeLink is **one product composed of independent services**. Each owns one domain and communicates through clean interfaces, so services can grow, be verified, and even launch on their own timeline, while all plugging into one booking flow and one wallet.

### Supply services (self-contained bookable catalogs)
- **Stays:** accommodation across short, medium, and long term. Owns listings, availability, verification status, pricing, and the nightly-vs-lease logic.
- **Mobility:** cars (self-drive or with driver) and airport pickup. Owns fleet, availability, and driver assignment.
- **Experiences:** tours, itineraries, national-park adventures, packaged by interest and age group. Owns activities, guides, and scheduling.

### Cross-cutting services (shared by all supply services)
- **Trip / Orchestration:** composes bookings from any supply service into one itinerary; the "cart plus journey" brain. Optional by design (see Principle 2).
- **Payments & Ledger:** multi-currency in, RWF out, escrow, FX, payouts. Provider-abstracted (card and Mobile Money adapters).
- **Identity & Trust:** accounts, KYC for supply, verification and guarantee records, reviews.
- **Messaging & Notifications:** in-app threaded conversations and a notification center that connect guests, supply, and the concierge team. Detailed in Section 8.
- **Concierge Ops:** internal tooling for the HomeLink team: verify and photograph listings, fulfil manual requests, run messaging, and manage payouts.
- **Localization:** the rules that key language, currency, payment rail, and content emphasis to segment.

**Why this shape:** a local house-seeker touches only Stays, Payments, and Messaging; a diaspora booker touches every service, same rails, different composition. It also lets us open a vetted-marketplace lane *inside* Stays later without disturbing Mobility or Experiences.

---

## 3. Domain Model: Booking atomic, Trip optional

```
Booking  (the atomic unit, can stand alone)
 ├─ owner, service (Stay | Car | Experience)
 ├─ dates, party, price, currency
 ├─ status: draft, confirmed, active, completed, cancelled
 ├─ escrow?  (held until check-in on high-value stays)
 └─ (Stay only) mode: nightly | lease

Trip  (OPTIONAL grouping, appears only for composed journeys)
 ├─ owner, segment, display currency
 ├─ status: draft, booked, active, completed
 └─ references many Bookings, one itinerary, one payment, one timeline
```

- **One Booking, no Trip:** a local renting an apartment, or anyone grabbing a single service. Clean and fast.
- **A Trip referencing three Bookings:** the diaspora arrival bundle (stay plus car plus tour).
- **Same booking primitives, different composition.** That's what makes the product feel like one thing while serving everyone.

---

## 4. Information Architecture & Entry Experience

### The landing experience
- **Intent doors sit *on top of* a browsable feed.** Locals who just want to scroll see listings immediately; the doors are a helpful hint, not a gate.
- **Global duration selector upfront:** a "when and how long" control (short, medium, long) that pre-configures the flow *before* results appear. Short and medium mean nightly booking; long means leasing.
- **Three intent lanes:**
  - **"I'm coming to Rwanda"** routes to the Journey experience (diaspora and tourist). Offers to compose a **Trip**.
  - **"I need a home"** routes to the Residential lane. Direct booking, long or medium-term leasing flow. No car or tour noise.
  - **"I need a car" / "I want to explore"** routes to Direct single-service entry (no Trip).

### Segment auto-adaptation (overridable)
Signals (IP or geolocation, browser locale, chosen language) set sensible defaults:
- **From abroad:** English or French, USD / EUR / GBP, card-first, diaspora or arrival framing, Trip prompts on.
- **From Rwanda:** Kinyarwanda available, RWF, Mobile-Money-first, residential framing forward, listings surfaced immediately.
A visible control lets anyone override language, currency, and lane at any time.

### Two booking paths
- **Direct:** single service, no Trip wrapper. Book, pay, done.
- **Trip:** compose multiple services; add-ons offered as dismissible suggestions; the Trip persists so items can be added later.

---

## 5. Key User Journeys

### A. Diaspora arrival bundle (Trip)
Abroad, chooses "coming to Rwanda", picks medium-term dates, books a verified apartment, is prompted "Add a car / Add a tour", adds both, checks out once in USD by card. **Escrow holds funds until check-in is confirmed.** Messages the concierge team in-app with arrival details, then lands to a home that's ready, a car waiting, and days planned.

### B. Tourist, short-term (Direct or Trip)
"Coming to Rwanda", short dates, books an apartment or guesthouse, optionally adds a car and a day-tour (interest or age-based), checks out at Booking.com-grade quality in their currency, and can add a tour later to the same Trip.

### C. Local house-seeker (Direct, no Trip)
Browsing from Rwanda (Kinyarwanda and RWF detected), enters the residential lane, filters long-term, neighbourhood, and budget, runs a **lease application** flow (documents, deposit), pays a Mobile-Money deposit, and messages the owner or concierge with questions. Never sees a tour.

### D. Local car rental (Direct, no Trip)
"I need a car", picks dates and pickup (e.g. airport), self-drive or with driver, pays by Mobile Money, and receives confirmation plus driver coordination messages. No accommodation, no Trip.

---

## 6. Internationalization & Localization Model

Localization here is **more than translated strings**. It is five coordinated layers:

| Layer | What adapts |
|---|---|
| **Language** | English, French, Kinyarwanda (extensible) |
| **Currency** | Display and settlement in USD / EUR / GBP and RWF, with live FX |
| **Payment rail** | International cards vs Mobile Money, by segment and choice |
| **Content emphasis** | Diaspora or arrival framing vs residential framing on the landing feed |
| **Default flow** | Trip-composition vs direct residential leasing |

All five default by segment and are individually overridable. This is the concrete form of "serve diaspora, tourists, and everyday Rwandans in one product."

---

## 7. Trust & Concierge Layer

The guarantee is delivered by people and enforced by software.

- **Verification workflow:** every listing is inspected, professionally photographed, quality-checked, and marked **HomeLink-verified** before going live. Recorded against the listing.
- **Escrow:** for high-value (especially diaspora) stays, funds are held until check-in is confirmed, then released to supply. This *is* the trust product.
- **Reviews and guarantee badge:** post-stay reviews and a visible verification badge reinforce authority.
- **Concierge Ops tooling:** role-based internal app for the HomeLink team to run verification, fulfil manual add-on requests, handle messaging, and manage payouts.

---

## 8. Messaging & Notifications

A load-bearing service, not an add-on. It is how a concierge marketplace coordinates trust in real time.

- **In-app threaded messaging**, scoped to a booking or Trip, between guest, supply (host, broker, driver, guide), and the concierge team. Real-time delivery, read state, and history.
- **Notification center** for booking, payment, and lifecycle events, delivered in-app and via PWA push.
- **External channel bridge.** The same messages and notifications fall back to **WhatsApp, SMS, and email**, because WhatsApp is where Rwandans and diaspora already are. In-app *bridges* to WhatsApp rather than competing with it, so a thread stays continuous across channels.
- **Ops visibility and support.** The concierge team sees all threads, can step into any conversation, and resolves disputes with the message history as the record. This gives dispute resolution a concrete home.
- **Locale-aware templates.** Automated messages render in the recipient's language (EN / FR / RW).

Touchpoints appear in every journey in Section 5: arrival coordination for the diaspora bundle, owner questions for the local house-seeker, and driver coordination for car rental.

---

## 9. MVP Scope (V1) and the Pressure-Release Valve

**V1 target (as decided): the full arrival bundle on full rails.**
- **Stays, Mobility, Experiences** all bookable.
- **Direct** booking *and* **Trip** composition.
- **Full payment rails:** cards plus Mobile Money, both directions, multi-currency, with escrow on high-value stays.
- **Messaging & Notifications:** in-app messaging, notification center, and WhatsApp / SMS / email bridge.
- **Localization:** EN / FR / RW, currency, rail, flow.
- **Concierge-verified inventory** in the launch market (Kigali) plus Concierge Ops tooling.

**Honest scope note.** This is an ambitious V1: it launches several hard things at once (three booking engines, full payments, and real-time messaging). It is the right *end state*; the risk is timeline. The following are **fast-follow candidates** the team can move out of V1 if needed, without redesign:

1. **Experiences as manual-concierge:** customer requests a tour; team fulfils by hand. `Experience` stays a first-class booking entity, so self-serve is additive later.
2. **Automated Mobile-Money *payouts*:** start with cards-in plus batch or manual payouts; automate MoMo-out next.
3. **Full WhatsApp two-way bridge:** launch with in-app messaging plus outbound WhatsApp / SMS / email, add inbound WhatsApp threading next.
4. **Property-management self-serve onboarding:** run owner onboarding offline at first.
5. **Native mobile apps:** PWA first; native later.
6. **Vetted-marketplace self-listing lane** inside Stays: concierge-only inventory at launch.

---

## 10. Roadmap

- **Phase 0, Foundations.** Identity and roles, Localization, Payments abstraction and Ledger, Messaging and Notifications core, Concierge Ops tooling, Stays core.
- **Phase 1, V1 launch (Kigali).** Full arrival bundle, concierge-verified inventory, full rails, in-app messaging plus channel bridge, EN / FR / RW.
- **Phase 2, Flywheel.** Property-management (diaspora owners become supply), Mobile Money everywhere, inbound WhatsApp threading, reviews and referral loops.
- **Phase 3, Scale.** Vetted-marketplace lane in Stays, native apps, more geographies and experiences.

---

## 11. Success Signals (tie-back to Lean Canvas)

Verified listings live · Trips *and* direct bookings · **bundle attach rate** · GMV and take rate · repeat and referral rate · **diaspora to property-management conversion** (the flywheel firing).

---

*Next document: **Technical Plan**, covering architecture, data model, payments, messaging, localization, and build sequencing.*
