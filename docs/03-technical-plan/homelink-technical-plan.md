# HomeLink: Technical Plan

*How we build the product defined in the Lean Canvas and the Product & UX document.*

**Date:** 2026-07-20 · **Stage:** Pre-build brainstorm · **Status:** Draft for team review
**Companion documents:** Lean Canvas (summary and detailed) · Product & UX Definition

---

## 1. Guiding Constraints

The architecture is shaped by five realities of this specific product:

1. **Money crosses currencies and rails.** Foreign cards in, RWF Mobile Money out, escrow in the middle, FX on top. Correctness and auditability of money is non-negotiable.
2. **Two very different networks.** Diaspora on good connections and desktops; local users on Android over mobile data. The frontend must be fast and light.
3. **Concierge-first.** An internal operations tool is a launch requirement, not an afterthought. It's how the guarantee is delivered.
4. **Composable but separable.** "Separate services that link" means clean domain boundaries now, so services can be extracted later without a rewrite.
5. **Trust is regulated.** KYC/AML on payouts, PCI on cards, and Rwanda's data-protection law all apply from day one.

---

## 2. Architecture Approach: Modular Monolith with Service Seams

**Decision:** build a **modular monolith**, not microservices, for V1.

- Each service from the Product doc (Stays, Mobility, Experiences, Trip, Payments & Ledger, Identity & Trust, Messaging & Notifications, Localization, Concierge Ops) is a **module with an explicit public interface** and its own schema namespace. Modules call each other only through those interfaces, never across internal tables.
- Deployed as **one application** for operational simplicity (one CI/CD pipeline, one DB, easy transactions across modules, which matters enormously for booking plus payment consistency).
- **Where the modules run:** the chosen React framework (Next.js or TanStack Start) hosts the modules as server-side code (server actions / route handlers, or `createServerFn`), backed by **Supabase** for Postgres, Auth, Storage, Realtime, and Edge Functions. Cross-cutting logic that must run independently of a page request (payment webhooks, scheduled payouts, reconciliation) lives in **Supabase Edge Functions**. Row-level security in Postgres enforces roles as a second line of defence behind the API.
- **Seams are real.** Because modules never reach into each other's internals, any one can be extracted into its own service later when scale or team structure demands it.

**Why not microservices now:** a pre-launch startup gets none of the benefits (independent scaling, team autonomy) and all of the costs (distributed transactions, network failure modes, ops overhead), especially painful for money flows that want ACID transactions. Modular-monolith-first is the pragmatic path that keeps the future open.

---

## 3. Technology Stack (proposed)

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | **Next.js** or **TanStack Start** (React), responsive **PWA**. See the decision in Section 3a | One codebase for diaspora desktop and local mobile; installable; offline-tolerant; SSR for SEO ("apartment Kigali") |
| **Backend platform** | **Supabase:** Postgres, Auth, Storage, Realtime, Edge Functions | One integrated platform covers the database, auth, files, realtime, and serverless logic, which shortens the ambitious V1 |
| **Server logic** | Framework server functions (Next.js server actions / route handlers, or TanStack Start `createServerFn`) plus Supabase Edge Functions | Type-safe server code co-located with the app; Edge Functions for request-independent jobs (webhooks, payouts, reconciliation) |
| **Database** | **PostgreSQL via Supabase** | Relational integrity for bookings and ledger; ACID transactions; row-level security; versioned migrations |
| **Auth** | **Supabase Auth** via `@supabase/ssr` (cookie-based, `getClaims` for verified JWT) plus role model | Framework-agnostic SSR auth; social plus email; RLS as a second line of defence |
| **Realtime** | **Supabase Realtime** | In-app messaging, notification delivery, live availability |
| **Storage/CDN** | **Supabase Storage** plus CDN | Verified listing photos, delivered light to low-bandwidth clients |
| **i18n** | next-intl (Next.js) or i18next / Lingui (TanStack Start) | Locale negotiation, message catalogs EN/FR/RW, currency and date formatting |
| **Card payments** | Stripe (or regional acquirer) | International cards, PCI handled by provider |
| **Mobile Money** | Aggregator (e.g. Flutterwave) plus direct MTN MoMo / Airtel Money | RWF in and out via the rails locals actually use |
| **Messaging channels** | WhatsApp Business API, SMS, email, PWA push | External bridge for the in-app messaging service |
| **Maps** | Geocoding plus routing provider | Listing locations, car pickup, itinerary routing |

*Stack is a recommendation, not a mandate. The module boundaries and the money model matter more than the specific vendors, which are swappable.*

### 3a. Frontend framework decision: Next.js vs TanStack Start

Both are full-stack React frameworks with automatic SSR (so the SEO-critical public listing pages render on the server) and type-safe server functions, and both pair cleanly with Supabase through `@supabase/ssr` (cookie-based auth works in any SSR framework). The choice is a genuine trade-off for the team to settle:

| Dimension | Next.js | TanStack Start |
|---|---|---|
| **Maturity / ecosystem** | Very mature, huge ecosystem, largest hiring pool | Younger, parts still stabilizing (some pieces recently alpha); smaller ecosystem |
| **SEO / rendering** | Mature SSR / SSG / ISR, strong for public marketing and listing pages | Automatic SSR, streaming, RSC; good for SEO, less battle-tested at scale |
| **Type safety** | Good, but router and data are less end-to-end typed | End-to-end type safety across router, loaders, and `createServerFn`, which suits the app-like surfaces (Trip builder, messaging, Concierge Ops) |
| **Developer experience** | Established conventions; opinionated | Vite-based DX, TanStack Router / Query integration |
| **Risk** | Lowest-risk default | Deliberate bet; upside in type safety and DX, downside in immaturity |

**Recommendation:** default to **Next.js** for V1. HomeLink leans heavily on SEO-critical public pages and an ambitious, time-boxed launch, so the mature ecosystem and hiring pool lower delivery risk. **TanStack Start** is a reasonable, deliberate bet if the team strongly values its end-to-end type safety and Vite DX for the authenticated app surfaces and can absorb the ecosystem immaturity. Whichever is chosen, Supabase is the backend either way, so the durable decisions (data model, money model, module boundaries) are unaffected by the framework choice.

---

## 4. Data Model: Highlights

Core entities (per-module schemas, referenced by ID across interfaces):

- **Identity & Trust:** `user`, `role` (guest, host/broker, developer, driver, guide, ops, admin), `kyc_record`, `verification_record`, `review`.
- **Stays:** `listing`, `availability`, `pricing_rule`, `lease_application`.
- **Mobility:** `vehicle`, `vehicle_availability`, `driver`.
- **Experiences:** `experience`, `experience_schedule`, `guide`.
- **Booking / Trip:** `booking` (atomic; polymorphic to a supply item), `trip` (optional grouping), `trip_item` (booking-to-trip link).
- **Payments & Ledger:** `payment`, `ledger_entry` (double-entry), `escrow_hold`, `fx_rate`, `payout`, `wallet/account`.
- **Messaging & Notifications:** `conversation` (scoped to a booking or Trip), `message`, `participant`, `notification`, `channel_delivery` (in-app, push, WhatsApp, SMS, email).

**Money is never a float.** Every monetary value is stored as **integer minor units plus ISO currency code**. All movements are recorded as **double-entry ledger entries**, so every balance is auditable and reconciliation is deterministic.

---

## 5. Payments Architecture (the hardest part, built for full rails)

A provider-agnostic core with swappable adapters:

```
                 ┌─────────────────────────────┐
                 │        Payments Core         │
Checkout ───────▶│  Ledger (double-entry)       │
                 │  Escrow  ·  FX  ·  Payout     │
                 └───────┬───────────────┬───────┘
                         │               │
                 PaymentRail (interface) │
                ┌────────┴───────┐  ┌────┴──────────┐
                │  CardRail       │  │  MoMoRail      │
                │  (Stripe/…)     │  │  (MTN/Airtel/  │
                │  money IN       │  │  aggregator)   │
                └─────────────────┘  │  IN and OUT    │
                                     └───────────────┘
```

- **`PaymentRail` interface:** `charge()`, `refund()`, `payout()`, `webhook()`. Card and Mobile Money are adapters implementing it; adding a rail is a new adapter, never a core change.
- **Escrow module:** holds funds against a booking; releases on check-in confirmation; refunds on cancellation per policy. Activated on high-value stays at launch, generalizable by config.
- **FX service:** sources rates, applies the spread, records the rate used on each transaction for audit.
- **Payout engine:** settles to supply in RWF (MoMo or bank); starts batch or manual-approved, moves to automated MoMo-out (fast-follow candidate).
- **Reconciliation:** every external event (card capture, MoMo callback) is matched to a ledger entry; unmatched items surface in Concierge Ops.
- **Tax:** Rwanda VAT on commission and applicable services is computed and recorded per transaction; see open questions for rate and invoicing details.

**Security:** card data never touches our servers (tokenized via provider, so PCI scope is minimized). Webhooks are signature-verified and idempotent.

---

## 6. Messaging & Notifications (Technical)

The service that keeps a concierge marketplace coordinated in real time.

- **In-app messaging:** `conversation` scoped to a booking or Trip, with `participant` roles (guest, supply, ops). Delivered over the **realtime layer** (WebSockets / managed realtime), with read state and persisted history.
- **Notification center:** lifecycle events (booking, payment, verification, arrival) fan out to an in-app inbox and **PWA push**.
- **External channel bridge:** a `channel_delivery` abstraction sends the same message or notification over **WhatsApp Business API, SMS, and email**, with per-recipient channel preference and locale-aware templates. Outbound bridging ships in V1; inbound WhatsApp threading is a fast-follow.
- **Ops and disputes:** the concierge team has visibility into all conversations, can join any thread, and uses message history as the dispute record.
- **Delivery guarantees:** notifications are queued and retried; provider webhooks confirm delivery and update `channel_delivery` status.

---

## 7. Internationalization (Technical)

- **Locale negotiation** from IP or geolocation plus `Accept-Language` plus explicit user choice; choice persists.
- **Message catalogs** per language (EN/FR/RW); Kinyarwanda copy reviewed by native speakers.
- **Currency:** display currency (buyer) decoupled from settlement currency (supply); conversion via the FX service; formatting per locale.
- **Content-emphasis and default-flow config:** a small rules layer keys landing emphasis (diaspora vs residential) and default flow (Trip vs direct lease) to segment, all overridable.

---

## 8. Identity, Roles & Trust

- **Auth:** Supabase Auth via `@supabase/ssr`; email plus social; JWT sessions with secure, cookie-based server handling; `getClaims` for verified server-side identity.
- **Roles / RBAC:** guest, host/broker, developer, driver, guide, **ops**, admin, enforced at the API and (where used) via row-level security.
- **KYC:** required for anyone receiving payouts (owners, brokers, developers, drivers, guides) before settlement.
- **Verification records:** link inspection, photo, and guarantee status to each listing; surfaced as the trust badge.

---

## 9. Concierge Ops (internal application)

A **role-gated area of the same app** (fastest path; avoids a second stack) for the HomeLink team to:
- queue and complete **listing verification** (inspect, upload photos, mark verified);
- **fulfil manual add-ons** (e.g. Experiences-as-concierge in V1);
- **run messaging and support** across all conversations;
- **manage payouts** and clear **reconciliation** exceptions;
- handle **booking interventions and disputes**.

---

## 10. Cross-Cutting Concerns

- **Performance for low bandwidth:** image optimization and responsive sizes, code-splitting, SSR/edge caching, minimal JS on critical paths, works on mid-range Android.
- **Observability:** structured logging, error tracking, payment and booking metrics dashboards; alerting on reconciliation gaps and failed notification deliveries.
- **Security and compliance:** PCI scope minimized via providers; KYC/AML on payouts; **Rwanda Data Protection & Privacy Law (2021)** compliance for personal data (consent, residency, retention); **VAT** handling on bookings and commission; secrets management; audit trails on money and verification.
- **Insurance and liability:** car rental damage and property damage cover, and platform liability limits, are defined per supply type; see open questions.
- **Environments and DevOps:** local, staging, production; one CI/CD pipeline; database migrations versioned; infrastructure-as-code kept light.

---

## 11. Build Sequencing (maps to the product roadmap)

Phase 0 is split, because the build split it: the surfaces were built first,
on fixtures, and the foundations are being built against them rather than
ahead of them. The reasoning is in Product & UX §10 and the record is in
`docs/superpowers/specs/2026-08-09-ui-milestone.md`. Everything after Phase 0
is unchanged.

- **Phase 0a, Surfaces on fixtures (done).** Repo and CI/CD · design tokens
  and the domain types · localization scaffold (EN/FR/RW) with locale-aware
  money and FX · **the repository seam** (`src/lib/repos`), which is the one
  place the data source is named · **Stays**, **Mobility** and **Experiences**
  browse, detail and checkout · guest, supply and concierge dashboards ·
  scoped messaging · a full browser sweep of every §5 journey in every role.
  No database, no auth, no payment provider, no realtime: four npm
  dependencies.
- **Phase 0b, Foundations.** Supabase schema and RLS behind the existing
  `Repositories` interface · Identity and roles (the role cookie in
  `lib/preferences/role.ts` becomes an auth claim, and nothing above it
  changes) · **Payments core (Ledger, PaymentRail, CardRail)** · **Messaging
  core plus realtime layer** · the data layer under the Concierge Ops shell
  that already exists.
- **Phase 1, V1 launch (Kigali).** Trip composition plus Direct booking ·
  **MoMoRail (in)** · Escrow on high-value stays · in-app messaging plus
  notification center plus outbound WhatsApp / SMS / email · end-to-end
  concierge inventory.
- **Phase 2, Flywheel.** Property-management module · **automated MoMo
  payouts** · **inbound WhatsApp threading** · reviews and referrals ·
  analytics depth.
- **Phase 3, Scale.** Vetted-marketplace self-listing lane in Stays · native
  apps · new geographies and experiences · service extraction where load
  justifies it.

### What 0a fixed about 0b

The point of building the front end first was to stop guessing at the schema.
Four things it changed, all of which would otherwise have been discovered
against live rows:

- `Conversation` needs **participant roles**, not just names. A booking has
  more than one thread and the wrong participant must not be able to open the
  other one. That is a row-level security policy, and it is much cheaper to
  know about it before the policy is written.
- **Unread is per reader**, so it is a join and not a column. The repository
  interface has no unscoped `conversations()` for the same reason: every read
  takes a viewer.
- Supply is reachable **by id as well as by slug**. A URL knows a slug; a
  `booking.supply_item_id` foreign key knows an id, and four screens need to
  resolve one into a photograph and a link.
- The **verification queue is not a listing**. A candidate somebody rang us
  about is a different row from a published listing, and modelling it as a
  half-populated `listing` puts an unverified property one boolean away from
  going live.

### The swap

`src/lib/repos/index.ts` is a single function returning a `Repositories`
object. Phase 0b adds `src/lib/repos/supabase/` exporting a
`supabaseRepositories` that satisfies the same interfaces, and flips it. No
screen imports a fixture, and no screen knows where a row came from — which is
what makes the sequencing above safe rather than merely convenient.

---

## 12. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Ambitious V1** (three engines, full rails, and messaging at once) | Pressure-release valve from the Product doc: defer Experiences-self-serve, MoMo-payout automation, inbound WhatsApp, etc., without redesign |
| **Payment/FX correctness** | Double-entry ledger, integer minor units, recorded FX per txn, idempotent webhooks, reconciliation dashboard |
| **Mobile Money integration variability** | Abstract behind `MoMoRail`; start with one aggregator; add direct MTN/Airtel later |
| **Realtime messaging reliability** | Managed realtime layer, queued and retried notifications, delivery status via provider webhooks |
| **Low-bandwidth UX** | PWA, image optimization, SSR/edge caching, performance budget on critical paths |
| **Concierge ops can't scale** | Tooling from day one; measure listings per ops-hour; plan vetted-marketplace lane for breadth |
| **Regulatory (KYC/AML, data law, VAT)** | KYC before payout; data-protection compliance built in; VAT recorded per txn; provider-handled PCI |
| **Insurance and liability exposure** | Per-supply-type cover and clear liability limits defined before launch |
| **Premature microservices** | Modular monolith with real seams; extract only when load or team justifies |

---

## 13. Open Questions for the Team

1. **Payment providers:** confirm card acquirer and MoMo aggregator(s) available and affordable in Rwanda; direct MTN MoMo and Airtel Money onboarding timelines.
2. **Escrow mechanics:** held in HomeLink's account vs a provider escrow product? Regulatory implications.
3. **VAT and invoicing:** applicable VAT rate on commission and services, and invoice/receipt requirements.
4. **Insurance and liability:** cover for car rental damage and property damage, and platform liability limits per supply type.
5. **Messaging channels:** WhatsApp Business API access and template approval timelines; inbound threading scope for V1 vs fast-follow.
6. **Launch market and inventory:** how many verified Kigali listings constitute a credible launch?
7. **Team and timeline:** engineering capacity vs the ambitious V1; where the pressure-release valve is likely to be pulled.
8. **Property-management legal:** contracts and liability for managing diaspora-owned units.
9. **Frontend framework:** Next.js vs TanStack Start (Section 3a), weighed against team skills and the balance of SEO-critical pages versus app-like surfaces.

---

*This plan is intentionally vendor-flexible: the module boundaries and money model are the durable decisions; specific providers are swappable.*
