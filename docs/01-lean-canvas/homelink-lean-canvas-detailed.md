# HomeLink: Lean Canvas (Detailed)

*Expanded companion to the one-page summary. Each block explains **what** we mean, **why** it matters, and the **reasoning and decisions** behind it, so the team can review, challenge, and build on it.*

**Product:** HomeLink, concierge-verified accommodation, cars, and tours for people coming to (and living in) Rwanda.
**Date:** 2026-07-20 · **Stage:** Pre-build brainstorm · **Status:** Draft for team review

---

## ① Problem

**What:** The three pains we exist to remove.

1. **Booking from abroad is low-trust and fragmented.**
   Diaspora Rwandans and foreign visitors cannot verify a property sight-unseen. Today they lean on WhatsApp threads, relatives acting as go-betweens, and informal brokers with no accountability. Photos may be fake or stale; deposits are wired on faith; there is no recourse if the place isn't as described. *This is the emotional core of the product: fear of being scammed or disappointed on arrival.*

2. **Arrival is disjointed.**
   A trip to Rwanda is really three separate, fragile arrangements: a place to stay, a car or transport, and knowing what to do. Each is booked through a different channel, and none is guaranteed to be ready when the traveler lands. The result is stress in the first 48 hours, exactly when a returning diaspora member or tourist is most vulnerable and least mobile.

3. **The local rental market is informal.**
   For everyday Rwandans, renting is opaque: pricing is negotiated case-by-case, brokers gatekeep access and charge inconsistent fees, and there's no standard for listing quality or contracts. Good supply is hard to discover; good tenants are hard for owners to find.

**Existing alternatives (and why they fall short):**
- **Airbnb / Booking.com:** thin, unverified Rwanda inventory; global trust systems don't translate to local guarantee; no car or tour integration; no diaspora framing.
- **Facebook / WhatsApp groups:** high noise, zero verification, scam-prone.
- **Personal networks / relatives:** doesn't scale, burdens family, still no guarantee.
- **Freelance brokers:** the very informality we're trying to replace.

**Why it matters:** These gaps are the wedge. The stronger the trust deficit, the more a *guaranteed* product wins.

---

## ② Customer Segments

**What:** Who we serve, and who we serve *first*.

- **Earlyvangelist (beachhead): the returning diaspora Rwandan.**
  Abroad, planning a trip home (visit, family event, business, scouting a move). Books a **medium-term** stay (weeks to months) plus a car, often **before** flying. Pays in USD, EUR, or GBP. High trust needs, higher willingness to pay, values done-for-you convenience. Frequently **owns idle property** in Kigali, which makes them supply as well as demand.

- **VISIT Rwanda tourists (short-term).**
  International visitors for gorilla trekking, Kigali conventions, Kwita Izina, and leisure. English or French first, expect Booking.com-grade checkout, short stays, high interest in tours and cars.

- **Everyday Rwandans (the core, high volume).**
  Local renters seeking **long-term** homes and occasional car rental. Kinyarwanda-friendly, Mobile-Money-first, price-sensitive. They mainly use the core rent and car services (not the full tourist bundle), and they provide the marketplace's baseline liquidity and legitimacy.

**Reasoning and decision:**
We can serve all three, but we **focus paying effort on diaspora and tourists** while keeping everyday Rwandans first-class on the core rent and car experience. The diaspora segment is the wedge because it combines *acute trust pain*, *ability to pay*, and a *dual role as supply*.

---

## ③ Unique Value Proposition

**What:** The single, distinct promise.

> **"Land in Rwanda with everything ready: a home we've personally verified, a car waiting, and your days planned. Booked from anywhere, in your currency, guaranteed."**

**High-level concept (elevator pitch):** *Concierge-grade Rwanda, one Trip.*

**Why this wording:** It leads with the emotional payoff ("everything ready", "guaranteed"), names the three services without listing them as features, and encodes the two hardest problems we solve: **trust** ("personally verified", "guaranteed") and **fragmentation** ("one Trip", "everything ready"). "In your currency" signals the diaspora and international fit.

---

## ④ Solution

**What:** How we deliver the promise.

- **Concierge-verified accommodation.** Every launch property is physically inspected, professionally photographed, quality-checked, and **guaranteed by HomeLink**. This is the trust product, the thing Airbnb structurally cannot offer in Kigali.
- **One "Trip" container.** A Trip composes stay, car, and tour. It's **intent-routed** (we help you find the right lane) and **never forced** (add-ons are optional, dismissible, and can be added later to the same Trip). A single-service booking needs no Trip at all.
- **Escrow-backed, multi-rail payments.** Money can be held until check-in is confirmed, then released. Money comes **in** via international cards *and* Mobile Money; payouts go **out** locally in RWF (MoMo or bank). We sit on the FX spread and the trust.
- **In-app messaging and notifications.** Guests, supply, and the concierge team coordinate in threaded, booking-scoped conversations, with lifecycle notifications that bridge to WhatsApp, SMS, and email.

**Reasoning and decision:** The concierge (curated, operator-run) model is a deliberate launch choice: quality and authority first, breadth later. It's the fastest path to the "we stand behind this" guarantee that the diaspora segment is actually paying for.

---

## ⑤ Channels

**What:** How we reach and acquire customers.

- **Diaspora community organizations and churches** abroad (high-trust, tight-knit, referral-rich).
- **Diaspora WhatsApp / Facebook groups:** meet demand where it already improvises solutions.
- **Rwanda embassies, consulates, and diaspora events** (e.g. Rwanda Day).
- **Referral loops:** every happy returnee is a node in a dense diaspora network.
- **VISIT Rwanda and tour-operator partnerships** for the tourist segment and tour supply.
- **Targeted social ads** (segment- and geography-keyed) plus **SEO** for high-intent queries ("apartment Kigali", "car rental Kigali airport").

**Reasoning:** Diaspora acquisition is **community- and referral-led**, not pure paid. Trust travels through existing networks, which lowers CAC and matches the product's trust promise.

---

## ⑥ Revenue Streams

**What:** How HomeLink makes money, a **stack**, with commission as the headline number.

- **Booking commission / margin (headline).** A cut or markup on each accommodation booking (~10-20% typical). The engine everyone understands; scales with volume.
- **Property-management fee (supply flywheel).** We manage idle diaspora- or developer-owned apartments and take a % of rent, turning *supply* into revenue and letting us rent those units to *other* travelers.
- **Car margin** on each vehicle booking.
- **Tour margin** on each experience.
- **Bundle markup** on the done-for-you Trip (convenience spread).
- **FX spread** on money-in (foreign currency) versus money-out (RWF).

**Reasoning and decision:** Stack all levers, but report and optimize against **commission** as the primary metric. The property-management line is the quiet strategic bet: it converts our best *customers* (diaspora owners) into our best *supply*.

---

## ⑦ Cost Structure

**What:** Where the money goes.

- **Concierge operations team:** verification, photography, on-the-ground fulfillment (the core cost of the guarantee; scales with inventory).
- **Payment and FX fees:** card processing, MoMo fees, currency conversion.
- **Platform build and hosting:** engineering, infrastructure, tooling.
- **Partner payouts:** owners, brokers, car owners, tour guides.
- **Customer acquisition:** diaspora marketing, partnerships, events.

**Reasoning:** The concierge model is **ops-heavy by design**, and that operational cost *is* the moat. The strategic question for the team is how far concierge scales before we open a vetted marketplace lane to grow inventory more cheaply.

---

## ⑧ Key Metrics

**What:** The numbers that tell us it's working.

- **Verified listings live:** supply health; the concierge bottleneck.
- **Trips booked:** core demand.
- **Bundle attach rate:** cars or tours per stay; proves the "one Trip" thesis.
- **GMV** (gross bookings value) and **take rate:** top line and margin quality.
- **Repeat / referral rate:** trust and network effects in the diaspora.
- **Diaspora to property-management conversion:** the flywheel firing (customer becomes supply).

**Reasoning:** Bundle attach rate and property-management conversion are the two *differentiating* metrics; they measure whether HomeLink is more than a booking site.

---

## ⑨ Unfair Advantage

**What:** What's hard for a competitor to copy.

- **Personally-verified, guaranteed inventory.** A trust product that a global platform cannot replicate in Kigali without building the same local ops muscle.
- **Diaspora property owners as both customers and supply.** A structural flywheel: the people most likely to book are also the people who own idle Kigali apartments.
- **Local operations presence.** Boots on the ground for inspection, fulfillment, and relationships that a remote platform can't fake.
- **Segment-native UX.** Currency, payment rail, language, and default flow all adapt to who you are, so a diaspora booker and a local house-seeker get genuinely different, appropriate experiences.

**Reasoning:** Individually copyable; **together** they compound. The moat is the *combination* of local trust operations, the diaspora dual-role network, and software that speaks each segment's language.

---

*Next documents in this set: **Product & UX Definition** and **Technical Plan**.*
