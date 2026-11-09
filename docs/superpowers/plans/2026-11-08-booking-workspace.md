# Booking, Workspace and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn HomeLink's demo checkout into a full booking product with a trip cart, give every kind of user a real dashboard in a staff workspace or a guest account area, and add in-app notifications, sign-in, settings and help, all as UI on fixtures in four languages.

**Architecture:** Public pages and staff pages split into two route groups under `[locale]`, so the workspace gets its own sidebar shell. Every read goes through `repos()`; every write goes through new repo methods called from server actions, which mutate an in-memory fixture store kept on `globalThis`. Pure logic (pricing, policies, cart checks, nav, schedules) lives in `src/lib` with Vitest tests; screens are verified in headless Chrome.

**Tech Stack:** Next.js 16.3 (App Router, server actions, route groups), React 19.2, next-intl 4, Tailwind 4, Vitest 5. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-booking-workspace-design.md`

## Global Constraints

- Read the matching guide in `node_modules/next/dist/docs/` before using a Next API (route groups, layouts, server actions, `redirect`, `revalidatePath`, route handlers). This is Next 16.3, not the one in training data.
- `package.json` dependencies stay at four: `next`, `next-intl`, `react`, `react-dom`.
- Every user-visible string exists in `messages/en.json`, `fr.json`, `rw.json` and `sw.json`. The parity test from Task 1 must pass after every task.
- No visible copy says "lease" (en) or "bail" (fr). Use "renting", "long-term stay", "rental agreement" / "location longue durée", "contrat de location". Code identifiers keep `lease`.
- Roles are exactly `visitor | guest | driver | guide | ops | admin`.
- Role is read on the server from the `homelink.role` cookie through `parseRole`. A screen never fetches rows for another role and hides them in the browser.
- Money is `Money` in minor units. A displayed total is the sum of displayed lines (`toDisplayQuote`). The server recomputes every price it stores.
- Dates are `IsoDate` strings. "Today", "this day" and policy windows are Kigali days (`OPERATING_TIMEZONE = "Africa/Kigali"`, UTC+2, no DST).
- Dates shown on both server and client are formatted on the server and passed down as strings (ICU differs between Node and Chrome: see the search-and-polish spec, "Measured on the way").
- Never call `alert`, `confirm` or `prompt`. Confirmations are in-page dialogs.
- Tap targets are at least 44px (`min-h-11`). Every form error focuses its field.
- Display classes are chosen with a ternary, never stacked through `cn` (`cn` does not merge Tailwind classes).
- Every new screen has loading, empty and error states, works in light and dark, and is checked at 360, 390, 1024 and 1440px wide.
- Phase 2 comments name what replaces a stub ("Phase 2 replaces this with ..."). Phase numbers keep their original meaning.
- Commit messages carry the reasoning, especially when a tidier alternative was rejected. End each with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks before every commit: `npx tsc --noEmit`, `npm run lint` (0 errors), `npm test`.

## Review Focus

1. **Kigali midnight.** At 22:30 UTC it is already tomorrow in Kigali. The Today board, notification grouping, refund windows and check-in release must use the Kigali day. Tests: Task 9 (`groupByDay`), Task 16 (`refundPreview` and `checkInReleased` at the boundary), Task 33 (`dayBoard`).
2. **A tampered client total.** A booking placed with a doctored total, an unknown extra or an expired promo must be stored at the server's price or refused. Test: Task 19 (`placeBooking ignores the client's total`).
3. **Two people, one flat.** Two drafts for the same single-unit listing on overlapping nights: the second must fail with `unavailable` and show the "dates taken" state, not create a second booking. Test: Task 19.
4. **A stale or forged role cookie.** `host`, `ADMIN` or garbage reads as `visitor`; a guest opening `/manage/finance` gets the not-for-you screen, and ops opening it gets the same. Tests: Task 3 (`parseRole`), Task 5 (`canAccess`).
5. **Sign-in `next=` pointing off-site.** `?next=//evil.example` or `?next=https://evil.example` must land on the account home. Test: Task 44 (`safeNext`).

---

## File structure

```
src/app/[locale]/layout.tsx                 html, body, providers, PreviewBar, Toaster only
src/app/[locale]/(site)/layout.tsx          SiteHeader + main + SiteFooter
src/app/[locale]/(site)/...                 every existing public page, moved
src/app/[locale]/(site)/account/...         guest area (Part 4, 5)
src/app/[locale]/(site)/trip/...            cart (Part 3)
src/app/[locale]/(site)/notifications/      full list (Part 2)
src/app/[locale]/(site)/sign-in ... help ... legal ...   (Part 5)
src/app/[locale]/(workspace)/manage/layout.tsx           access gate + WorkspaceShell
src/app/[locale]/(workspace)/manage/<section>/page.tsx   one folder per nav item
src/app/actions/*.ts                        server actions, one file per area
src/app/api/notifications/unread/route.ts   badge poll
src/components/workspace/*                  shell, sidebar, top bar, table, tiles
src/components/booking/*                    flow shell and steps
src/components/cart/*                       CTA, pill, add-to-trip, trip page parts
src/components/notifications/*              bell, panel, list, toaster, prefs
src/components/account/*                    account nav and guest widgets
src/lib/workspace/nav.ts, day-board.ts, schedules.ts
src/lib/booking/draft.ts, use-draft.ts, payment-sim.ts, ics.ts
src/lib/domain/extras.ts, promo.ts, payment-plan.ts, policies.ts
src/lib/cart.ts, src/lib/cart-checks.ts
src/lib/notifications/catalog.ts, group.ts
src/lib/auth/safe-next.ts
src/lib/repos/fixtures/store.ts             the mutable in-memory store
```

Tests sit beside the code as `*.test.ts` (Vitest includes `src/**/*.test.ts`).

---

# Part 1: Languages, roles and the workspace shell

### Task 1: Swahili as the fourth locale, and a parity test

**Files:**
- Create: `messages/sw.json`, `src/i18n/messages.test.ts`
- Modify: `src/i18n/routing.ts`, `src/lib/search/vocabulary.ts`, `src/lib/search/parse.test.ts`, `src/lib/search/meili-engine.ts` (synonyms, if it sets them), `src/components/shell/preference-controls.tsx` (language list renders from `LOCALE_LABELS`; check)

**Interfaces:**
- Produces: `routing.locales = ["en", "fr", "rw", "sw"]`; `LOCALE_LABELS.sw = "Kiswahili"`; `INTL_LOCALES.sw = "sw-RW"`; `NUMBER_LOCALES.sw = "sw-RW"`.

- [ ] **Step 1: Write the parity test** in `src/i18n/messages.test.ts`. It loads the four JSON files, flattens to dotted keys, and asserts:

```ts
it("every locale has exactly the English keys", () => {
  for (const l of ["fr", "rw", "sw"]) expect(keys(l)).toEqual(keys("en"));
});
it("every translation keeps the English placeholders", () => {
  for (const l of ["fr", "rw", "sw"]) for (const k of keys("en"))
    expect(placeholders(l, k), `${l}:${k}`).toEqual(placeholders("en", k));
});
it("no string is empty", () => { /* every value in every locale has trim().length > 0 */ });
```

`placeholders` collects the top-level `{name}` arguments of an ICU string (the argument names before `,` in `{count, plural, ...}`), sorted.

- [ ] **Step 2: Run it.** `npx vitest run src/i18n/messages.test.ts`. Expected: FAIL, `messages/sw.json` not found.
- [ ] **Step 3: Add `sw` to `routing.ts`** with the values above. Leave `layout.tsx`'s `initialSegment` rule as is (`rw` gets `rwanda`, every other locale `abroad`), which gives Swahili the abroad defaults the spec chose.
- [ ] **Step 4: Write `messages/sw.json`**, all 1,072 strings, same structure as `en.json`. Keep brand names, neighbourhood names, `RWF`, `KGL` and placeholders untranslated. Plurals use `one` and `other`.
- [ ] **Step 5: Teach the parser Swahili.** In `vocabulary.ts` add `// sw` stop words (`na`, `ya`, `wa`, `kwa`, `karibu`, `nataka`, `natafuta`, `nyumba`, `usiku`, `chini`) and lane and room words (`nyumba` → stay, `gari` → car, `chumba`/`vyumba` → bedrooms, `bei` with `chini ya` → price ceiling). In `parse.test.ts` add:

```ts
it("reads a Swahili sentence", () => {
  const i = parse("nyumba vyumba 2 Kimihurura chini ya 150000 RWF");
  expect(i.lane).toBe("stays");
  expect(i.bedrooms).toBe(2);
  expect(i.neighbourhood).toBe("Kimihurura");
  expect(i.maxPrice).toEqual({ minor: 150000, currency: "RWF" });
});
it("reads gari as the cars lane", () => { expect(parse("gari na dereva").lane).toBe("cars"); });
```

`parse` is the file's existing `(q) => parseQuery(q, ctx)` helper.

- [ ] **Step 6: Run all tests.** `npm test`. Expected: PASS.
- [ ] **Step 7: Check Swahili in Chrome.** `npm run dev`, then headless-screenshot `/sw`, `/sw/stays` and a stay detail at 390 and 1440. Read the RWF prices and a date range on the image: expect `RWF 165,000` with a comma and Swahili month names. If Chrome groups differently from Node, switch `NUMBER_LOCALES.sw` to `en-RW` (the trick `rw` already uses) and say why in the commit.
- [ ] **Step 8: Commit** with the reasoning: why `sw-RW` (measured in Node and Chrome), why abroad defaults, that the copy needs a native reader.

### Task 2: Say renting, not lease

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`, `messages/rw.json`, `messages/sw.json`, `src/i18n/messages.test.ts`

- [ ] **Step 1: Add the vocabulary test** to `messages.test.ts`:

```ts
it("never says lease to a reader", () => {
  expect(values("en").filter((v) => /\blease/i.test(v))).toEqual([]);
  expect(values("fr").filter((v) => /\bbail\b|\bbaux\b/i.test(v))).toEqual([]);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL, listing the 19 English strings (for example `"longTerm": "Long-term lease"`, `"applyForLease": "Apply for a lease"`).
- [ ] **Step 3: Rewrite each string.** Patterns: "long-term lease" → "long-term stay"; "apply for a lease" → "apply to rent"; "the lease" (the document) → "the rental agreement"; "lease authority" → "the right to rent it out". French: "location longue durée", "contrat de location". Rewrite the same keys in `rw` and `sw` (Kinyarwanda `ubukode bw'igihe kirekire`, Swahili `kupanga kwa muda mrefu`; both assistant-written). Do not rename keys.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Screenshot** `/en/stays?band=long`, a renting detail page and its apply panel at 1440; read every heading and button on the image.
- [ ] **Step 6: Commit.** Say that identifiers keep `lease` and why (copy only; no reader sees a type name).

### Task 3: Remove the host role; HomeLink hosts every home

**Files:**
- Modify: `src/lib/domain/types.ts` (`Role`), `src/lib/preferences/role.ts`, `src/lib/domain/domain.test.ts`, `src/components/shell/preview-bar.tsx`, `src/components/shell/site-header.tsx`, `src/components/shell/account-menu.tsx`, `src/app/[locale]/queue/page.tsx` (`PAYEE_ROLE`), `src/lib/repos/fixtures/data.ts`, `src/components/listing/supply-owner-band.tsx`, the three detail pages that render it, `messages/*.json` (`roles.host`, escrow copy)
- Create: `src/components/listing/hosted-by.tsx`

**Interfaces:**
- Produces: `Role` without `"host"`; `supplyLaneFor(role): "car" | "experience" | null`; `readsAs(role)` returns `role` for every role (admin is now a real participant); `Listing.propertyManager: { name: string; since: string }`.

- [ ] **Step 1: Write failing tests** in `domain.test.ts`:

```ts
it("reads a retired host cookie as a visitor", () => {
  expect(parseRole("host")).toBe("visitor");
  expect(parseRole("ADMIN")).toBe("visitor");
});
it("gives admin no supply lane; homes are not a partner's", () => {
  expect(supplyLaneFor("admin")).toBeNull();
  expect(supplyLaneFor("driver")).toBe("car");
});
```

Rename the existing `supplierShare` test name "leaving cleaning with the host" to "leaving cleaning outside the fee"; its assertions stay.

- [ ] **Step 2: Run.** Expected: FAIL on `parseRole("host")`.
- [ ] **Step 3: Remove `host`** from `Role`, `ROLES`, the preview bar list, `SIGNED_IN`, `BY_ROLE`. `PAYEE_ROLE` loses `stay`: stay rows in the payouts tab go away, and the stay `Payout` fixtures are deleted. Fixture threads with `participantRoles: ["ops", "host"]` become `["ops", "admin"]`, and messages with `authorRole: "host"` become `"admin"`. Make `readsAs` the identity and have `messaging.forRole("admin")` return every thread. Remove `roles.host` from the four message files.
- [ ] **Step 4: Add `propertyManager`** to every `Listing` fixture (two or three named staff, spread across listings) and render `HostedBy` on the stay detail page where the host band sat: "Hosted by HomeLink", the manager's name, "on the team since {year}".
- [ ] **Step 5: Turn the supplier band into the admin band.** `supply-owner-band.tsx` renders for `admin` on stays and for `driver` or `guide` on their own lane. The admin band links "Edit in workspace" to `/manage/portfolio/{slug}` (built in Task 38; until then the link resolves to the not-built page).
- [ ] **Step 6: Reword escrow** (`verification.escrow*`, `checkout.escrowTitle`, `checkout.escrowBody`) in all four languages, following the spec: refundable and not counted as HomeLink's until the team confirms you are inside.
- [ ] **Step 7: Run checks**, then screenshot a stay detail as visitor and as admin, and the queue payouts tab as ops.
- [ ] **Step 8: Commit.** Say why a stale `host` cookie maps to visitor rather than admin.

### Task 4: Two layouts, site and workspace

**Files:**
- Move: every folder and file under `src/app/[locale]/` except `layout.tsx` into `src/app/[locale]/(site)/` (`git mv`, so history follows)
- Create: `src/app/[locale]/(site)/layout.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Read** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` and `layout.md`. There is one root layout (`[locale]/layout.tsx`), so moving between groups does not trigger a full reload.
- [ ] **Step 2: Move the pages** with `git mv`. `not-found.tsx` and `[...rest]` move too.
- [ ] **Step 3: Split the layout.** `[locale]/layout.tsx` keeps `<html>`, fonts, `ThemeScript`, `NextIntlClientProvider`, `PreferencesProvider`, `SmartSearchProvider` and `PreviewBar`. `(site)/layout.tsx` renders `SiteHeader`, `<main id="content" className="flex-1">`, `SiteFooter`.
- [ ] **Step 4: Prove nothing moved.** Write `scripts/route-smoke.mjs` (a plain Node script, not a test) that requests every public route in all four locales against a running dev server and prints any status other than 200 (and 404 for the deliberate not-found path). Run it. Expected: no lines printed.
- [ ] **Step 5: Screenshot** `/en`, `/en/stays` and `/en/trips` at 1440 and compare them with screenshots from before the move: expect them to be identical.
- [ ] **Step 6: Commit** as a pure move plus the layout split, so the diff reviews as a rename.

### Task 5: The workspace navigation model

**Files:**
- Create: `src/lib/workspace/nav.ts`, `src/lib/workspace/nav.test.ts`

**Interfaces:**
- Produces:

```ts
export type WorkspaceSection =
  | "overview" | "today" | "bookings" | "calendar" | "asks" | "inspections"
  | "housekeeping" | "maintenance" | "incidents" | "inbox" | "notifications"
  | "portfolio" | "rates" | "tenants" | "sales" | "partners" | "finance"
  | "people" | "content" | "settings" | "audit"
  | "jobs" | "schedule" | "earnings" | "documents";
export type NavItem = { section: WorkspaceSection; href: `/manage/${string}`; icon: IconName };
export type NavGroup = { key: "work" | "homes" | "money" | "platform" | "partner"; items: NavItem[] };
export function workspaceNav(role: Role): NavGroup[];
export function canAccess(role: Role, section: WorkspaceSection): boolean;
export function homeFor(role: Role): `/manage/${string}` | null;
export function isWorkspaceRole(role: Role): boolean;
```

`IconName` is the union of icon component names exported from `src/components/ui/icons.tsx`. Add any icon an item needs there, in the existing 16px stroke style.

- [ ] **Step 1: Write the tests:**

```ts
it("gives ops the work group and the read-only calendar, no money or platform", () => {
  const s = sections("ops");
  expect(s).toEqual(expect.arrayContaining(["today","bookings","calendar","asks","inspections","housekeeping","maintenance","incidents","inbox"]));
  expect(s).not.toContain("finance"); expect(s).not.toContain("portfolio");
});
it("gives admin everything ops has and every homes, money and platform section", () => {
  expect(sections("admin")).toEqual(expect.arrayContaining([...sections("ops"), "overview","portfolio","rates","tenants","sales","partners","finance","people","content","settings","audit"]));
});
it("gives a driver and a guide only partner sections", () => {
  expect(sections("driver").sort()).toEqual(["documents","earnings","inbox","jobs","notifications","schedule"]);
  expect(sections("guide")).toEqual(sections("driver"));
});
it("gives guests and visitors no workspace", () => {
  expect(workspaceNav("guest")).toEqual([]); expect(homeFor("visitor")).toBeNull();
});
it("refuses a section the role does not have", () => {
  expect(canAccess("ops", "finance")).toBe(false);
  expect(canAccess("guest", "finance")).toBe(false);
  expect(canAccess("admin", "finance")).toBe(true);
});
it("sends each role to its own home", () => {
  expect(homeFor("admin")).toBe("/manage/overview");
  expect(homeFor("ops")).toBe("/manage/today");
  expect(homeFor("driver")).toBe("/manage/jobs");
});
```

`sections(role)` in the test is `workspaceNav(role).flatMap(g => g.items.map(i => i.section))`. Every role in the workspace also gets `notifications`.

- [ ] **Step 2: Run.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `nav.ts` with one table of items, each carrying the roles allowed, and derive the groups from it. Group order: work, homes, money, platform for staff; partner for drivers and guides.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 6: The workspace shell

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/layout.tsx`, `src/app/[locale]/(workspace)/manage/page.tsx` (redirects to `homeFor(role)`), `src/app/[locale]/(workspace)/manage/[...rest]/page.tsx` (not built yet), `src/components/workspace/workspace-shell.tsx`, `sidebar.tsx`, `workspace-topbar.tsx`, `workspace-drawer.tsx`, `bottom-tabs.tsx`, `not-for-you.tsx`, `section-header.tsx`
- Modify: `messages/*.json` (new `workspace` namespace)

**Interfaces:**
- Consumes: `workspaceNav`, `canAccess`, `homeFor`, `isWorkspaceRole` (Task 5).
- Also create: `src/lib/workspace/guard.ts`.
- Produces: `<SectionHeader title description? actions? />` for every workspace page; `requireSection(section: WorkspaceSection): Promise<Role>` in `src/lib/workspace/guard.ts`, which reads the cookie, renders `SignedOut` for a visitor, renders `NotForYou` when `canAccess` is false, and returns the role otherwise. Every workspace page calls it first.

- [ ] **Step 1: Layout.** Server component: reads the role; a visitor sees the existing `SignedOut` screen inside a minimal frame (logo plus the preview sign-in); a guest sees `NotForYou` with a link home; workspace roles get `WorkspaceShell`.
- [ ] **Step 2: Sidebar.** 248px expanded, 64px collapsed, sticky full height, groups with small headings, active item with brand tint and `aria-current="page"`, unread counts as badges (`inbox`, `notifications`, `asks`). Collapsed state lives in `localStorage` under `homelink.sidebar.v1` through `useSyncExternalStore` with a server snapshot of "expanded", the same pattern as `saved.ts`. `[` toggles it when focus is not in a field. Collapsed items show the label as a tooltip on hover and focus.
- [ ] **Step 3: Top bar.** 56px. Left: the drawer button (below 1024px) and the section title. Right: workspace search (opens the ⌘K palette scoped to staff results; Task 34 adds booking lookup), bell slot (Task 11), New menu (admin: new listing, new block, new ticket; ops: new ticket, new booking note), property switcher for admin (a select of stays that filters calendar, housekeeping and maintenance through `?property=`), the account menu with "Back to the site".
- [ ] **Step 4: Drawer and bottom tabs.** Below 1024px the sidebar becomes a drawer: focus trapped, Esc closes, closes on navigation. For `driver` and `guide` below 640px, a bottom tab bar with Jobs, Schedule, Inbox, Earnings, and More (opens the drawer); the page gets bottom padding equal to the bar plus `env(safe-area-inset-bottom)`.
- [ ] **Step 5: Measure.** Headless Chrome as admin at 1440 and 1024, ops at 1024, driver at 390: read `getBoundingClientRect()` of the sidebar (expect 248 and then 64 after pressing `[`), check that the page has no horizontal scroll (`scrollWidth === clientWidth`), and screenshot each in light and dark. Open the drawer at 390 and screenshot it.
- [ ] **Step 6: Commit** with the reasoning for a sidebar here and not on the site (from the spec).

### Task 7: Site header, account menu, old routes and the account menu inside pages

**Files:**
- Modify: `src/components/shell/account-menu.tsx`, `site-header.tsx`, `mobile-menu.tsx`, `footer-account-column.tsx`, `src/app/[locale]/(site)/queue/page.tsx`, `src/app/[locale]/(site)/inventory/page.tsx`
- Create: `src/app/[locale]/(site)/account/layout.tsx`, `src/app/[locale]/(site)/account/page.tsx` (placeholder until Task 30), `src/components/account/account-nav.tsx`

**Interfaces:**
- Produces: `ACCOUNT_SECTIONS = ["overview","trips","renting","viewings","payments","saved","notifications","settings"] as const` in `account-nav.tsx`, with hrefs `/account`, `/trips`, `/account/renting`, `/account/viewings`, `/account/payments`, `/saved`, `/notifications`, `/account/settings`. `renting` and `viewings` show only when the guest has one (prop `has: { renting: boolean; viewings: boolean }`).

- [ ] **Step 1: Account menu destinations.** Guest: My HomeLink, Trips, Messages, Notifications, Settings. Workspace roles: Open workspace (`homeFor(role)`), Notifications, and Messages for ops and admin pointing at `/manage/inbox`. `AccountLinks` in the header: guest keeps Trips and Messages; workspace roles get one link "Workspace".
- [ ] **Step 2: Old routes.** `/queue` and `/inventory` become server components that `redirect()` to `homeFor(role)` (or `/` for guests and visitors), keeping `?tab=` mapped: `verify` → `/manage/inspections`, `asks` → `/manage/asks`, `payouts` → `/manage/finance?tab=payouts`, `threads` → `/manage/inbox`, `booked` → `/manage/jobs`, `money` → `/manage/earnings`. Their old tab components stay in place to be moved in Part 4.
- [ ] **Step 3: Account layout.** `(site)/account/layout.tsx` shows `AccountNav` as a 220px left column from 1024px up, and as a horizontal scroll strip of pills above the content below that. `/trips`, `/saved` and `/notifications` render inside the same frame by wrapping their content in `<AccountFrame>` (exported from `account-nav.tsx`), so the URLs do not change.
- [ ] **Step 4: Screenshot** the header and account menu for guest, ops, admin and driver at 1440 and 390, plus `/queue?tab=payouts` as ops (expect `/manage/finance?tab=payouts` and the not-for-you screen, since ops has no finance; ops payouts then live only with admin, as the spec says).
- [ ] **Step 5: Commit.**

---

# Part 2: Notifications

### Task 8: The fixture store and the audit log

**Files:**
- Create: `src/lib/repos/fixtures/store.ts`, `src/lib/repos/fixtures/store.test.ts`
- Modify: `src/lib/repos/fixtures/index.ts` (reads move to the store), `src/lib/domain/types.ts` (`AuditEntry`)

**Interfaces:**
- Produces:

```ts
export type AuditEntry = { id: string; at: string; actor: Role; action: string; target: string; detail?: string };
export type FixtureStore = {
  bookings: Booking[]; trips: Trip[]; payouts: Payout[]; listings: Listing[];
  audit: AuditEntry[];
  // Later tasks add their own collections here and seed them in `seed()`:
  // Task 9 adds notifications and prefs, Task 19 payments and blocks, and so on.
};
export function store(): FixtureStore;      // seeded once, kept on globalThis.__homelinkStore
export function resetStore(): void;         // tests only
export function recordAudit(e: Omit<AuditEntry, "id" | "at">): AuditEntry;
export function nextId(prefix: string): string;  // "bk_0001", monotonic per prefix
```

- [ ] **Step 1: Test** that two calls to `store()` return the same object, that a write survives a second `store()`, that `resetStore()` restores the seed, and that `recordAudit` stamps `at` as an ISO instant and appends.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The seed is a deep copy of `data.ts` (`structuredClone`), so writes never mutate the module constants. Existing repo reads switch to `store()` collections. Add a Phase 2 comment: Supabase replaces this file, and the repo types do not change.
- [ ] **Step 4: Run all tests and the route smoke script.** Expected: PASS, no changes on screen.
- [ ] **Step 5: Commit.** Say why the store sits on `globalThis` (dev reloads modules on edit; module state alone would reset mid-session) and why writes are in memory rather than in the URL (an ops screen has to see a booking a guest just made).

### Task 9: Notification types, catalog, repo and day grouping

**Files:**
- Create: `src/lib/notifications/catalog.ts`, `src/lib/notifications/group.ts`, `src/lib/notifications/notifications.test.ts`
- Modify: `src/lib/domain/types.ts`, `src/lib/domain/instants.ts`, `src/lib/repos/types.ts`, `src/lib/repos/fixtures/index.ts`, `src/lib/repos/fixtures/data.ts`, `messages/*.json` (`notifications` namespace)

**Interfaces:**
- Produces:

```ts
export type NotificationCategory = "booking" | "payment" | "message" | "stay" | "work" | "system";
export type NotificationKind =
  | "bookingConfirmed" | "paymentReceived" | "paymentFailed" | "momoPending" | "checkInReady"
  | "rentDue" | "newMessage" | "reviewRequest" | "viewingConfirmed"
  | "newBooking" | "arrivalToday" | "newAsk" | "newIncident" | "inspectionDue"
  | "jobOffered" | "jobChanged" | "payoutSent" | "documentExpiring";
export type Channel = "inApp" | "email" | "sms" | "whatsapp" | "push";
export type AppNotification = {
  id: string; audience: Role; kind: NotificationKind; category: NotificationCategory;
  params: Record<string, string | number>; href: string; createdAt: string; readAt?: string;
};
export type NotificationPrefs = { channels: Partial<Record<NotificationKind, Channel[]>>; quietHours: { from: string; to: string } | null };

// catalog.ts
export const NOTIFICATION_CATALOG: Record<NotificationKind, { category: NotificationCategory; audiences: Role[]; defaultChannels: Channel[] }>;
export function defaultPrefs(role: Role): NotificationPrefs;   // quietHours { from: "22:00", to: "07:00" }

// group.ts
export type DayGroup = "today" | "yesterday" | "earlier";
export function groupByDay(items: AppNotification[], now: Date): { group: DayGroup; items: AppNotification[] }[];

// instants.ts
export function kigaliDay(instant: Date | string): IsoDate;

// repos/types.ts
export interface NotificationsRepo {
  forRole(role: Role, filter?: { category?: NotificationCategory; unreadOnly?: boolean }): Promise<AppNotification[]>;
  unreadCount(role: Role): Promise<number>;
  markRead(role: Role, ids: string[]): Promise<number>;
  markAllRead(role: Role): Promise<number>;
  create(input: Omit<AppNotification, "id" | "createdAt" | "readAt" | "category">): Promise<AppNotification>;
  prefs(role: Role): Promise<NotificationPrefs>;
  setPrefs(role: Role, prefs: NotificationPrefs): Promise<void>;
}
```

`Repositories` gains `notifications: NotificationsRepo`. `create` fills `category` from the catalog and refuses an audience the catalog does not list for that kind.

- [ ] **Step 1: Write the tests:**

```ts
it("reads the Kigali day, not the UTC one", () => {
  expect(kigaliDay("2026-11-08T22:30:00Z")).toBe("2026-11-09");
  expect(kigaliDay("2026-11-08T21:59:59Z")).toBe("2026-11-08");
});
it("groups by Kigali day", () => {
  const now = new Date("2026-11-09T06:00:00Z");           // 08:00 in Kigali
  const g = groupByDay([n("2026-11-08T22:30:00Z"), n("2026-11-08T21:00:00Z"), n("2026-11-01T10:00:00Z")], now);
  expect(g.map((x) => [x.group, x.items.length])).toEqual([["today",1],["yesterday",1],["earlier",1]]);
});
it("never shows one role another role's notifications", async () => { /* forRole("ops") has no audience "guest" item */ });
it("ignores ids that belong to another role when marking read", async () => {
  const guestId = (await r.forRole("guest"))[0].id;
  expect(await r.markRead("ops", [guestId])).toBe(0);
  expect((await r.forRole("guest"))[0].readAt).toBeUndefined();
});
it("counts unread after marking", async () => { /* unreadCount drops by the number marked */ });
it("refuses to send a guest a staff event", async () => {
  await expect(r.create({ audience: "guest", kind: "newIncident", params: {}, href: "/" })).rejects.toThrow();
});
```

`resetStore()` runs in `beforeEach`.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the types, catalog, grouping and repo. Seed 8 to 12 notifications per role in `data.ts`, spread over today, yesterday and the last fortnight relative to `today()`, so the panel is never empty and never stale. Add `notifications.kinds.<kind>.title` and `.body` strings with their params in four languages.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 10: Notification actions and the unread poll

**Files:**
- Create: `src/app/actions/notifications.ts`, `src/app/api/notifications/unread/route.ts`

**Interfaces:**
- Produces: `markNotificationsRead(ids: string[]): Promise<void>`, `markAllNotificationsRead(): Promise<void>`, `saveNotificationPrefs(prefs: NotificationPrefs): Promise<void>`, `simulateNotification(kind?: NotificationKind): Promise<AppNotification>` (preview only: picks a kind the current role can receive when none is given). Each reads the role from the cookie, never from an argument, calls the repo, records an audit entry, and calls `revalidatePath("/[locale]", "layout")`. `GET /api/notifications/unread` returns `{ count: number }` for the cookie's role, with `Cache-Control: no-store`.

- [ ] **Step 1: Read** the server actions guide and the route handler guide in `node_modules/next/dist/docs/01-app/`.
- [ ] **Step 2: Implement** both files.
- [ ] **Step 3: Verify** with the dev server: `curl -s --cookie "homelink.role=guest" localhost:3000/api/notifications/unread` prints a count; with `homelink.role=host` it prints `{"count":0}`.
- [ ] **Step 4: Commit.**

### Task 11: The bell and its panel

**Files:**
- Create: `src/components/notifications/bell.tsx` (server: initial count and the latest 8), `notification-panel.tsx` (client), `notification-item.tsx`, `use-unread.ts`
- Modify: `src/components/shell/site-header.tsx`, `src/components/workspace/workspace-topbar.tsx`, `src/components/shell/mobile-menu.tsx`

**Interfaces:**
- Consumes: Task 9 repo and `groupByDay`; Task 10 actions and route.
- Produces: `<NotificationItem notification compact? />`, reused by the full page; `useUnread(initial: number): number`, which polls `/api/notifications/unread` every 30 seconds while the tab is visible.

- [ ] **Step 1: Bell.** A 36px icon button with a count badge (`9+` above nine) and an `aria-label` that says the count. Hidden for visitors.
- [ ] **Step 2: Panel.** A popover 380px wide (full-width sheet below 640px): All and Unread tabs, a category filter, groups headed Today / Yesterday / Earlier, items showing an icon per category, title, body, a relative time formatted on the server, and an unread dot. Clicking an item marks it read and follows `href`. "Mark all as read" and "See all" (to `/notifications` or `/manage/notifications`). Esc closes and focus returns to the bell. An empty state per tab.
- [ ] **Step 3: Place it.** Site header: between search and Saved. Measure the phone bar at 360 and 390 with the bell in place: logo, search, saved, bell and menu must fit without the wordmark wrapping. If they do not fit at 360, move Saved into the menu sheet below 400px and say so in the commit. Workspace top bar: before the New menu.
- [ ] **Step 4: Screenshot** the panel open for guest and ops at 1440 and 390, both themes, with unread and with none.
- [ ] **Step 5: Commit.**

### Task 12: Notification pages

**Files:**
- Create: `src/app/[locale]/(site)/notifications/page.tsx`, `src/app/[locale]/(workspace)/manage/notifications/page.tsx`, `src/components/notifications/notification-list.tsx`

- [ ] **Step 1: Build** one `NotificationList` (filters in the URL as `?category=&unread=1&page=`, 20 per page through `paginate`, grouped by day, mark all read) used by both pages. The site page sits in `AccountFrame`; the workspace page calls `requireSection("notifications")`.
- [ ] **Step 2: Screenshot** both pages with a filter applied and on page 2.
- [ ] **Step 3: Commit.**

### Task 13: Toasts and simulated events

**Files:**
- Create: `src/components/notifications/toaster.tsx`
- Modify: `src/app/[locale]/layout.tsx`, `src/components/shell/preview-bar.tsx`, `use-unread.ts`

**Interfaces:**
- Produces: `<Toaster />` and `useToast(): { show(t: { title: string; body?: string; href?: string; tone?: "info" | "ok" | "warn" | "crit" }): void }`. Booking and payment screens in Part 3 call `show` too.

- [ ] **Step 1: Toaster.** Bottom-right stack (bottom-centre on phones, above the bottom tabs), at most three, 6 seconds each, paused on hover and focus, dismissable, in an `aria-live="polite"` region.
- [ ] **Step 2: New-event toasts.** When `useUnread` sees the count rise, fetch the newest item (extend the route with `?latest=1`) and show it as a toast.
- [ ] **Step 3: Preview bar.** Add "Send a test notification" which calls `simulateNotification()`; the toast and the badge update without a reload.
- [ ] **Step 4: Screenshot** a toast in light and dark, at 1440 and 390.
- [ ] **Step 5: Commit.** Say that the 30-second poll stands in for Supabase Realtime.

### Task 14: Notification preferences and the push prompt

**Files:**
- Create: `src/components/notifications/prefs-matrix.tsx`, `push-prompt.tsx`, `src/app/[locale]/(site)/account/settings/notifications/page.tsx`, `src/app/[locale]/(workspace)/manage/notifications/settings/page.tsx`

- [ ] **Step 1: Matrix.** Rows are the kinds the role can receive, grouped by category; columns are the five channels; each cell a checkbox with a full label for screen readers ("Email for payment failed"). In-app cannot be switched off for `paymentFailed`, `momoPending` and `checkInReady`, shown as a locked tick with a reason. Quiet hours: on/off and two time selects in 30-minute steps, labelled Kigali time. Save calls `saveNotificationPrefs` and toasts.
- [ ] **Step 2: Push prompt.** A card with "Turn on phone notifications". `Notification.requestPermission()` runs only on that click, and the result states (granted, denied with how to undo, unsupported) each get a sentence. Nothing asks on page load.
- [ ] **Step 3: Phones.** Below 640px the matrix becomes one card per kind with five toggles.
- [ ] **Step 4: Screenshot** at 1440 and 390.
- [ ] **Step 5: Commit.**

---

# Part 3: The booking flow and the trip cart

### Task 15: Extras, promo codes and the deposit plan

**Files:**
- Create: `src/lib/domain/extras.ts`, `src/lib/domain/promo.ts`, `src/lib/domain/payment-plan.ts`, `src/lib/domain/booking-pricing.test.ts`
- Modify: `src/lib/domain/pricing.ts`, `src/lib/domain/types.ts`, `src/components/listing/quote-breakdown.tsx`, `messages/*.json` (`quoteLines`, `extras`)

**Interfaces:**
- Produces:

```ts
export type ExtraKey = "airportPickup" | "earlyCheckIn" | "lateCheckout" | "groceries" | "cot" | "midStayClean" | "childSeat" | "fullInsurance";
export type ExtraUnit = "perBooking" | "perVisit" | "perDay";
export type ExtraSelection = { key: ExtraKey; quantity: number };
export const EXTRAS: Record<ExtraKey, { lane: ServiceKind; price: Money; unit: ExtraUnit; maxQuantity: number }>;
export function extrasFor(lane: ServiceKind): ExtraKey[];
export function priceExtras(lane: ServiceKind, selected: ExtraSelection[], days: number): QuoteLine[];  // drops unknown keys, other lanes' keys, quantity <= 0; clamps to maxQuantity

export type PromoResult = { ok: true; code: string; discount: Money } | { ok: false; code: string; reason: "unknown" | "expired" | "notApplicable" };
export function applyPromo(code: string, quote: Quote, on: IsoDate): PromoResult;

export type DepositPlan = { offered: false } | { offered: true; now: Money; balance: Money; balanceDue: IsoDate };
export function depositPlan(quote: Quote, start: IsoDate, on: IsoDate): DepositPlan;

// pricing.ts
export type QuoteInput = { kind: ServiceKind; start: IsoDate; end: IsoDate; party: number; driveMode?: DriveMode; extras?: ExtraSelection[]; promoCode?: string };
export function quoteBooking(supply: Listing | Vehicle | Experience, input: QuoteInput, on: IsoDate): (Quote & { promo?: PromoResult }) | null;
```

`QuoteLineKey` gains `"extra"` and `"discount"`; `QuoteLine` gains `extra?: ExtraKey`. A discount line has a negative amount. Prices and units are the spec's extras table, in RWF. `KARIBU10` is 10% of the accommodation line, capped at 50,000 RWF, valid until `2027-12-31`; on cars and days out it is `notApplicable`. Deposit plan: offered when nights >= 28 or total >= 1,000,000 RWF (converted when the quote is in another currency), and `start` is at least 14 days after `on`; `now` is 30% rounded to the currency's minor unit, `balance = total - now`, `balanceDue = start - 14 days`.

- [ ] **Step 1: Write the tests:**

```ts
it("prices a stay's extras per booking and per visit", () => {
  const lines = priceExtras("stay", [{ key: "airportPickup", quantity: 1 }, { key: "midStayClean", quantity: 2 }], 7);
  expect(lines.map((l) => [l.extra, l.amount.minor])).toEqual([["airportPickup", 25000], ["midStayClean", 30000]]);
});
it("prices a car's extras per day", () => {
  expect(priceExtras("car", [{ key: "childSeat", quantity: 1 }], 3)[0].amount.minor).toBe(15000);
});
it("drops extras from another lane and unknown keys", () => {
  expect(priceExtras("stay", [{ key: "childSeat", quantity: 1 }, { key: "jacuzzi" as ExtraKey, quantity: 1 }], 2)).toEqual([]);
});
it("caps KARIBU10 at 50,000 RWF", () => { /* a 900,000 accommodation line gives -50,000, not -90,000 */ });
it("refuses KARIBU10 on a car", () => { expect(applyPromo("KARIBU10", carQuote, "2026-11-08")).toMatchObject({ ok: false, reason: "notApplicable" }); });
it("reads promo codes case-insensitively and trims them", () => { /* " karibu10 " works */ });
it("offers a deposit on 28 nights, not on 27", () => { /* ... */ });
it("does not offer a deposit when arrival is 13 days away", () => { /* ... */ });
it("splits the deposit so the two parts add up to the total", () => { /* now + balance === total, for an odd total */ });
it("totals a booking as the sum of its lines, discount included", () => {
  const q = quoteBooking(listing, { kind: "stay", start, end, party: 2, extras: [{ key: "groceries", quantity: 1 }], promoCode: "KARIBU10" }, on)!;
  expect(q.total.minor).toBe(q.lines.reduce((s, l) => s + l.amount.minor, 0));
});
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `quoteBooking` delegates to `quoteStay`, `quoteVehicle` and `quoteExperience`, appends extras, then applies the promo, then sets `escrowHeld` on the final total. `QuoteBreakdown` renders extra lines under their names and the discount in the ok colour with a minus sign.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 16: Policies: refunds, check-in release, holds and date changes

**Files:**
- Create: `src/lib/domain/policies.ts`, `src/lib/domain/policies.test.ts`

**Interfaces:**
- Produces:

```ts
export type RefundRule = "full" | "half" | "none" | "carFree" | "carOneDay" | "dayFree" | "dayPermitKept" | "dayNone";
export type RefundPreview = { refund: Money; kept: Money; rule: RefundRule; freeUntil: IsoDate | null };
export function refundPreview(service: ServiceKind, quote: Quote, start: IsoDate, today: IsoDate, opts?: { permitShare?: Money; hireDays?: number }): RefundPreview;
export const CHECK_IN_HOUR = 14;  // Kigali
export function checkInReleasedAt(start: IsoDate): string;   // ISO instant: start - 2 days at 14:00 Kigali, i.e. 12:00Z
export function checkInReleased(start: IsoDate, now: Date): boolean;
export const HOLD_MINUTES = 15;
export function holdSecondsLeft(startedAt: string, now: Date): number;   // never negative
export function changeDifference(before: Quote, after: Quote): Money;    // after - before; negative means a refund
```

Rules come from the spec's Policies section. "Days before" is `nightsBetween(today, start)`, with `today` a Kigali day.

- [ ] **Step 1: Write the tests:**

```ts
it("refunds a stay in full exactly 7 days out", () => { expect(refundPreview("stay", q, "2026-11-16", "2026-11-09").rule).toBe("full"); });
it("refunds half the accommodation and all the cleaning 6 days out", () => {
  const p = refundPreview("stay", q, "2026-11-15", "2026-11-09");
  expect(p.rule).toBe("half");
  expect(p.refund.minor).toBe(line(q, "accommodation") / 2 + line(q, "cleaning"));
});
it("refunds nothing on the arrival day", () => { expect(refundPreview("stay", q, "2026-11-09", "2026-11-09").refund.minor).toBe(0); });
it("keeps refund and kept adding up to the total", () => { /* for every rule */ });
it("charges one day of a hire inside 48 hours", () => { /* hireDays 4: kept = total / 4 */ });
it("never refunds a permit", () => { /* dayPermitKept keeps permitShare even 10 days out */ });
it("releases check-in details at 14:00 Kigali two days before", () => {
  expect(checkInReleasedAt("2026-11-12")).toBe("2026-11-10T12:00:00.000Z");
  expect(checkInReleased("2026-11-12", new Date("2026-11-10T11:59:59Z"))).toBe(false);
  expect(checkInReleased("2026-11-12", new Date("2026-11-10T12:00:00Z"))).toBe(true);
});
it("counts a hold down to zero and stops", () => {
  expect(holdSecondsLeft("2026-11-08T10:00:00Z", new Date("2026-11-08T10:14:00Z"))).toBe(60);
  expect(holdSecondsLeft("2026-11-08T10:00:00Z", new Date("2026-11-08T11:00:00Z"))).toBe(0);
});
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 17: The booking draft and the steps per lane

**Files:**
- Create: `src/lib/booking/draft.ts`, `src/lib/booking/draft.test.ts`, `src/lib/booking/use-draft.ts`
- Modify: `src/lib/domain/types.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export type GuestDetails = { name: string; email: string; phone: string; travellerName?: string; arrivalTime?: string; purpose?: "work" | "leisure"; requests?: string };
export type Participant = { name: string; age: number; nationality?: string; passport?: string };
export type RentApplication = { occupants: number; employer: string; incomeBand: "under500k" | "500kTo1m" | "1mTo2m" | "over2m"; idFileName?: string; moveIn: IsoDate; months: number };
export type PaymentRail = "card" | "mobileMoney" | "bankTransfer";

// draft.ts
export type FlowKind = "stay" | "rent" | "car" | "experience" | "trip";
export type StepKey = "driver" | "people" | "details" | "application" | "extras" | "review" | "agreement" | "pay";
export const STEPS: Record<FlowKind, readonly StepKey[]> = {
  stay: ["details", "extras", "review", "pay"],
  rent: ["details", "application", "review", "agreement", "pay"],
  car: ["driver", "details", "extras", "review", "pay"],
  experience: ["people", "details", "review", "pay"],
  trip: ["details", "extras", "review", "pay"],
};
export type BookingDraft = {
  id: string; flow: FlowKind; slug: string; start: IsoDate; end: IsoDate; party: number;
  driveMode?: DriveMode; slot?: string; pickup?: { kind: "airport" | "hotel" | "address"; detail: string; flight?: string };
  licenceFileName?: string; dietary?: string;
  guest: Partial<GuestDetails>; participants: Participant[]; extras: ExtraSelection[];
  promoCode?: string; acceptedRules: boolean; application?: RentApplication;
  agreement?: { signedName: string; agreedAt: string };
  plan: "full" | "deposit"; rail: PaymentRail; holdStartedAt: string;
};
export type DraftAction =
  | { type: "guest"; value: Partial<GuestDetails> } | { type: "participants"; value: Participant[] }
  | { type: "extras"; value: ExtraSelection[] } | { type: "promo"; value: string | undefined }
  | { type: "acceptRules"; value: boolean } | { type: "application"; value: RentApplication }
  | { type: "sign"; signedName: string; at: string } | { type: "plan"; value: "full" | "deposit" }
  | { type: "rail"; value: PaymentRail } | { type: "driveMode"; value: DriveMode }
  | { type: "pickup"; value: BookingDraft["pickup"] } | { type: "slot"; value: string }
  | { type: "licence"; fileName: string | undefined } | { type: "dietary"; value: string };
export function draftId(flow: FlowKind, slug: string, start: IsoDate, end: IsoDate, party: number): string;
export function newDraft(init: Pick<BookingDraft, "flow" | "slug" | "start" | "end" | "party">, now: Date): BookingDraft;
export function draftReducer(d: BookingDraft, a: DraftAction): BookingDraft;
export function stepComplete(d: BookingDraft, step: StepKey): boolean;
export function firstIncompleteStep(d: BookingDraft): StepKey;
export function canEnter(d: BookingDraft, step: StepKey): boolean;   // every earlier step complete

// use-draft.ts (client)
export function useBookingDraft(init: Pick<BookingDraft, "flow" | "slug" | "start" | "end" | "party">): [BookingDraft, (a: DraftAction) => void, { reset(): void }];
```

Completion rules: `details` needs a valid name, email and phone with the checkout form's existing rules (move `VALID` from `checkout-form.tsx` into `src/lib/booking/validation.ts` and import it in both places); `travellerName` is required when the guest says they are booking for someone else. `people` needs `party` participants, each with a name and an age of at least the experience's `minAge`, plus nationality and passport when the experience needs a permit. `driver` needs `driveMode`, and `licenceFileName` when it is `selfDrive`. `extras` is always complete. `review` needs `acceptedRules`. `application` needs every `RentApplication` field except the file. `agreement` needs a `signedName` that matches `guest.name` ignoring case and spaces. The draft lives in `sessionStorage` under `homelink.draft.v1.<id>`; a draft older than its hold is kept but restarts the hold.

- [ ] **Step 1: Write the tests:**

```ts
it("gives the same id for the same booking", () => { expect(draftId("stay","a","2026-12-01","2026-12-05",2)).toBe(draftId("stay","a","2026-12-01","2026-12-05",2)); });
it("will not let a guest reach pay before accepting the house rules", () => {
  const d = withDetails(newDraft(init, now));
  expect(canEnter(d, "pay")).toBe(false);
  expect(canEnter(draftReducer(d, { type: "acceptRules", value: true }), "pay")).toBe(true);
});
it("needs the traveller's name when booking for someone else", () => { /* ... */ });
it("needs a licence for self-drive, not with a driver", () => { /* ... */ });
it("needs passports for a permit day, not for a city walk", () => { /* ... */ });
it("needs the signature to match the guest's name", () => { /* "  ange  uwase" matches "Ange Uwase" */ });
it("returns to the first step that is not done", () => { /* ... */ });
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `draft.ts`, `validation.ts` and `use-draft.ts` (the hook reads `sessionStorage` after mount, so the first render matches the server).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 18: Payment simulation

**Files:**
- Create: `src/lib/booking/payment-sim.ts`, `src/lib/booking/payment-sim.test.ts`

**Interfaces:**
- Produces:

```ts
export type CardOutcome = "approved" | "declined" | "challenge";
export type MomoOutcome = "approved" | "declined" | "timeout";
export function cardOutcome(cardNumber: string): CardOutcome;   // digits only; 4000000000000002 declined, 4000002760003184 challenge, else approved
export function momoOutcome(msisdn: string): MomoOutcome;       // national number ends 0000: timeout; 1111: declined; else approved
export function momoProvider(msisdn: string): "mtn" | "airtel" | null;   // 078, 079 MTN; 072, 073 Airtel; with or without 0, 250, +250
export const MOMO_WAIT_SECONDS = 90;
```

- [ ] **Step 1: Tests** for each test number, for spaced input (`"4000 0027 6000 3184"`), and for provider detection across the three ways a Rwandan number is written (`0788123456`, `788123456`, `+250 788 123 456`), plus `0751234567` → `null`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** Say that this mirrors provider test modes, so every payment state can be shown on purpose.

### Task 19: Availability, booking writes and `placeBooking`

**Files:**
- Create: `src/app/actions/bookings.ts`, `src/lib/repos/fixtures/bookings.test.ts`
- Modify: `src/lib/domain/types.ts`, `src/lib/repos/types.ts`, `src/lib/repos/fixtures/index.ts`, `src/lib/repos/fixtures/store.ts`, `src/lib/repos/fixtures/data.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export type PaymentRecord = { id: string; bookingId: string; rail: PaymentRail; kind: "full" | "deposit" | "balance" | "rent" | "change" | "refund"; amount: Money; status: "pending" | "succeeded" | "failed" | "refunded"; at: string };
export type BookingEventKind = "placed" | "paid" | "datesChanged" | "guestsAdded" | "checkInReleased" | "checkedIn" | "checkedOut" | "cancelled" | "refunded" | "reviewed" | "issueReported" | "noteAdded";
export type BookingEvent = { at: string; kind: BookingEventKind; actor: Role; note?: string };
// Booking gains (all optional, so existing fixtures still type-check):
//   guest?: GuestDetails; extras?: ExtraSelection[]; promoCode?: string; paymentPlan?: "full" | "deposit";
//   lines?: QuoteLine[]; timeline?: BookingEvent[]; tripId?: string; driveMode?: DriveMode;
//   pickup?: BookingDraft["pickup"]; participants?: Participant[]; application?: RentApplication;
//   checkedInAt?: string; cancelledAt?: string; refund?: Money; staffNotes?: string[];

// repos/types.ts
export type PlaceBookingInput = { draft: BookingDraft; clientTotal: Money; payment: { rail: PaymentRail; outcome: "approved" } };
export type PlaceResult = { ok: true; booking: Booking } | { ok: false; reason: "unavailable" | "invalid" | "priceChanged"; quote?: Quote };
export interface AvailabilityRepo {
  bookedNights(supplyId: string, from: IsoDate, to: IsoDate): Promise<IsoDate[]>;  // nights with no unit left
  blocked(supplyId: string, from: IsoDate, to: IsoDate): Promise<{ date: IsoDate; reason: "booked" | "maintenance" | "owner" }[]>;
  isFree(supplyId: string, from: IsoDate, to: IsoDate): Promise<boolean>;
  block(supplyId: string, dates: IsoDate[], reason: "maintenance" | "owner"): Promise<void>;
  unblock(supplyId: string, dates: IsoDate[]): Promise<void>;
}
// BookingRepo gains:
//   place(input: PlaceBookingInput): Promise<PlaceResult>;
//   cancel(reference: string, by: Role, reason: string, today: IsoDate): Promise<Booking>;
//   changeDates(reference: string, start: IsoDate, end: IsoDate, today: IsoDate): Promise<{ ok: true; booking: Booking; difference: Money } | { ok: false; reason: "unavailable" | "invalid" }>;
//   addEvent(reference: string, event: Omit<BookingEvent, "at">): Promise<Booking>;
//   listAll(query?: { status?: BookingStatus[]; service?: ServiceKind; from?: IsoDate; to?: IsoDate; q?: string }): Promise<Booking[]>;
//   payments(bookingId?: string): Promise<PaymentRecord[]>;

// actions/bookings.ts
export async function placeBooking(input: PlaceBookingInput): Promise<PlaceResult>;
export async function cancelBooking(reference: string, reason: string): Promise<Booking>;
export async function changeBookingDates(reference: string, start: IsoDate, end: IsoDate): Promise<...>;  // same result as the repo
```

`place` recomputes the quote with `quoteBooking` from the stored supply, the draft and `kigaliDay(new Date())`; checks every step with `stepComplete`; checks `isFree` against `unitsAvailable`; stores the server's quote (lines and total), never `clientTotal`. When the server's total differs from `clientTotal` by more than one minor unit, it returns `priceChanged` with the new quote and stores nothing, so the guest sees the new price before paying it. It writes a `placed` and a `paid` event, a `PaymentRecord`, a `bookingConfirmed` notification for the guest and a `newBooking` one for ops, and an audit entry. The reference comes from `bookingReference` seeded with the new id. `listForCurrentUser` returns seeded and placed guest bookings. Seed blocked maintenance dates on two listings.

- [ ] **Step 1: Write the tests:**

```ts
it("stores the server's price, not the client's", async () => {
  const r = await repos.bookings.place({ draft, clientTotal: serverTotal, payment });
  expect(r.ok && r.booking.total).toEqual(serverTotal);
});
it("refuses a total the server does not agree with", async () => {
  const r = await repos.bookings.place({ draft, clientTotal: { ...serverTotal, minor: 1 }, payment });
  expect(r).toMatchObject({ ok: false, reason: "priceChanged" });
  expect(await repos.bookings.listAll()).toHaveLength(seededCount);
});
it("drops extras that are not on the menu before pricing", async () => { /* a "jacuzzi" extra does not appear in lines */ });
it("refuses the second of two overlapping bookings on a one-unit flat", async () => {
  expect((await place(draftA)).ok).toBe(true);
  expect(await place(overlapping(draftA))).toMatchObject({ ok: false, reason: "unavailable" });
});
it("lets two bookings share a changeover day", async () => { /* A ends 12-05, B starts 12-05: both ok */ });
it("refuses a draft with a step left undone", async () => { /* no acceptedRules: invalid */ });
it("tells the guest and the desk", async () => { /* one bookingConfirmed for guest, one newBooking for ops */ });
it("cancels with the policy's refund and frees the nights", async () => { /* ... */ });
```

- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** Say why a price mismatch refuses instead of charging the new number silently.

### Task 20: The flow shell and its steps

**Files:**
- Create: `src/components/booking/flow-shell.tsx`, `flow-summary.tsx`, `hold-timer.tsx`, `steps/details-step.tsx`, `steps/extras-step.tsx`, `steps/review-step.tsx`, `steps/pay-step.tsx`, `steps/payment-status.tsx`, `steps/three-ds-dialog.tsx`, `states/hold-expired.tsx`, `states/dates-taken.tsx`, `states/price-changed.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/file-drop.tsx`
- Modify: `src/components/checkout/step-spine.tsx`, `src/components/checkout/checkout-form.tsx` (removed once `pay-step` replaces it), `messages/*.json` (`booking` namespace)

**Interfaces:**
- Consumes: Tasks 15 to 19.
- Produces:
  - `<FlowShell flow draft quote supply steps current onNavigate>`: spine, title, hold timer, the step, a sticky summary aside from 1024px up and a collapsible summary bar below, plus Back and Continue.
  - `StepSpine` takes `steps: readonly string[]` plus a leading done "Dates" step, so every lane shows dates done, then its own steps.
  - `<Dialog open onClose title>` (focus trap, Esc, return focus) for every in-page confirmation from here on.
  - `<FileDrop accept maxMb onFile>`: choose or drop a file, show its name, size and an image preview. Nothing is uploaded; `onFile` gets the `File`.
- Behaviour:
  - The step lives in the URL as `?step=`. Entering a step `canEnter` refuses redirects to `firstIncompleteStep`.
  - The hold timer shows mm:ss from 5 minutes left and turns warn-coloured at 2. At zero `HoldExpired` replaces the step with "Your dates are no longer held" and a "Check again and continue" button that calls `availability.isFree` and restarts the hold.
  - The details step offers "Sign in", which opens `/sign-in?next=<this url>` from Part 5 (until then the preview sign-in), and "Continue as a guest".
  - The extras step lists `extrasFor(lane)` as cards with steppers where `maxQuantity > 1`, updating the summary live.
  - The review step shows house rules (`Listing.houseRules: string[]` added to fixtures) behind a required checkbox, the cancellation rule with this booking's `freeUntil` date, the full breakdown and the promo field (apply, error per `reason`, remove).
  - The pay step keeps the existing card and Mobile Money fields and their formatting, adds bank transfer for `rent`, adds the full-or-deposit choice when `depositPlan` offers one, and names the exact amount on the button.
  - Card `challenge` opens `ThreeDsDialog` (a mock bank page asking for a 6-digit code, any code passes, Cancel declines). Mobile Money shows `PaymentStatus`: "Approve the payment on your phone" with the provider's name, a 90-second countdown, "I've approved it" and "Use another number". `timeout` and `declined` each have their own sentence and retry.
  - On approval it calls `placeBooking`. `unavailable` shows `DatesTaken` with the next free dates and a link back. `priceChanged` shows `PriceChanged` with old and new totals and "Pay the new total". Success clears the draft, toasts and routes to `/bookings/<reference>`.
  - The "nothing is charged" notice shrinks to a one-line preview note under the button.

- [ ] **Step 1: Build `Dialog` and `FileDrop`**, then the shell and the four steps with their states.
- [ ] **Step 2: Wire the stay flow** in Task 21 before verifying, since the shell needs a lane to render.
- [ ] **Step 3: Commit** with the shell and steps together (they review as one unit).

### Task 21: The nightly stay flow

**Files:**
- Modify: `src/app/[locale]/(site)/stays/[slug]/book/page.tsx`, `src/components/listing/booking-panel.tsx`

- [ ] **Step 1: Page.** The server reads `from`, `to`, `party` and `step`, loads the listing, the blocked nights and the base quote, and renders `FlowShell` with `flow: "stay"`. Unusable dates still redirect to the detail page, as today.
- [ ] **Step 2: Walk it in Chrome**, and screenshot each state at 1440 and 390:
  1. A happy path with card `4242 4242 4242 4242`, ending on the confirmation.
  2. A decline with `4000 0000 0000 0002`.
  3. 3-D Secure with `4000 0027 6000 3184`.
  4. A Mobile Money timeout on `0788120000`.
  5. `KARIBU10` applied, then removed.
  6. The deposit plan on a 30-night stay.
  7. A refresh on the review step, which must restore the draft.
  8. An expired hold: set `holdStartedAt` 16 minutes back in `sessionStorage`.
  9. Dates taken: place the same dates in a second tab first.
  10. Booking for someone else.
- [ ] **Step 3: Check the numbers** on the review image: lines add up to the total, and the button names the same amount in USD and in RWF.
- [ ] **Step 4: Commit.**

### Task 22: The car flow

**Files:**
- Create: `src/components/booking/steps/driver-step.tsx`
- Modify: `src/app/[locale]/(site)/cars/[slug]/book/page.tsx`, `messages/*.json`

- [ ] **Step 1: Driver step.** With or without a driver (only the modes the vehicle has); for self-drive, `FileDrop` for the licence, image or PDF up to 10 MB, plus a note that the team checks it at handover. Pickup: Kigali International Airport (with a flight number field, format two letters or digits then 1 to 4 digits, uppercase, for example `WB464`), a hotel or an address, as free text.
- [ ] **Step 2: Wire it** with `flow: "car"`, the car extras and the car refund rule.
- [ ] **Step 3: Screenshot** self-drive with a licence, with a driver from the airport, and the flight number error.
- [ ] **Step 4: Commit.**

### Task 23: The day-out flow

**Files:**
- Create: `src/components/booking/steps/people-step.tsx`
- Modify: `src/app/[locale]/(site)/experiences/[slug]/book/page.tsx`, `src/lib/domain/types.ts` (`Experience.slots: string[]`, `Experience.requiresPermit: boolean`, `Experience.permitShare?: Money`), fixtures, `messages/*.json`

- [ ] **Step 1: People step.** A time slot as segmented choices from `slots`; one row per person with name and age (refusing ages under `minAge` with the reason); nationality (select) and passport number when `requiresPermit`, with a sentence on why the park needs them. Pickup point (prefilled with `meetingPoint`) and dietary needs.
- [ ] **Step 2: Fixtures.** The gorilla trek gets `requiresPermit: true` and a `permitShare`; give the others slots.
- [ ] **Step 3: Wire it** with `flow: "experience"` and the day-out refund rule, showing in the review that the permit part is never refunded.
- [ ] **Step 4: Screenshot** a city walk for two and the gorilla trek for three, at 390 and 1440.
- [ ] **Step 5: Commit.**

### Task 24: The long-term stay (renting) flow

**Files:**
- Create: `src/app/[locale]/(site)/stays/[slug]/rent/page.tsx`, `src/components/booking/steps/application-step.tsx`, `steps/agreement-step.tsx`, `src/components/booking/move-in-checklist.tsx`
- Modify: `src/components/listing/lease-panel.tsx` (its button goes to `/stays/[slug]/rent?moveIn=&months=`), `messages/*.json`

- [ ] **Step 1: Application step.** Occupants, employer or school, a monthly income band, an ID or passport (`FileDrop`), the move-in date and the length in months (minimum from the listing's terms).
- [ ] **Step 2: Agreement step.** The rental agreement rendered from the listing's terms (rent, deposit months, what is included, notice period, house rules) in a scroll box; "I have read the agreement" unlocks only after scrolling to the end (checked with an `IntersectionObserver` on the last paragraph); a typed full name that must match; then the date.
- [ ] **Step 3: Pay step for rent.** Deposit plus first month as two lines; card, Mobile Money or bank transfer. Bank transfer shows HomeLink's account details from fixtures and a reference to quote, and the booking is placed with a `pending` payment and a "We'll confirm when it arrives" state.
- [ ] **Step 4: Confirmation extras.** `MoveInChecklist` (keys, meter readings, inventory walk-through, a photo of each room) on the booking page for `stayMode: "lease"`.
- [ ] **Step 5: Walk** a full application in Chrome and screenshot every step at 390 and 1440, reading each line for the word "lease".
- [ ] **Step 6: Commit.**

### Task 25: Viewings for homes for sale

**Files:**
- Create: `src/app/[locale]/(site)/buy/[slug]/viewing/page.tsx`, `src/components/sale/viewing-form.tsx`, `src/lib/domain/viewing-slots.ts`, `src/lib/domain/viewing-slots.test.ts`, `src/app/actions/viewings.ts`
- Modify: `src/components/sale/enquiry-panel.tsx`, `src/lib/domain/types.ts`, `src/lib/repos/types.ts`, fixtures, `messages/*.json`

**Interfaces:**
- Produces: `type Viewing = { id: string; saleId: string; mode: "inPerson" | "video"; date: IsoDate; time: string; contact: GuestDetails; notes?: string; status: "requested" | "confirmed" | "rescheduled" | "done" | "cancelled" }`; `viewingSlots(from: IsoDate, days: number, taken: { date: IsoDate; time: string }[]): { date: IsoDate; times: string[] }[]` (Monday to Saturday, 09:00 to 16:00 hourly starts, none on Sunday, taken slots removed); `ViewingsRepo { create(v): Promise<Viewing>; forCurrentUser(): Promise<Viewing[]>; all(): Promise<Viewing[]>; setStatus(id, status, time?): Promise<Viewing> }`; `requestViewing(input)` action, which notifies the guest (`viewingConfirmed` once staff confirm) and ops.

- [ ] **Step 1: Test** `viewingSlots`: no Sunday, eight starts on a weekday, a taken slot removed.
- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS.
- [ ] **Step 3: Form and page.** In person or video, a date strip, time chips, contact and notes, then a confirmation with what to bring (ID; for video, a link sent the day before).
- [ ] **Step 4: Screenshot** and **commit.**

### Task 26: Confirmation, receipt and calendar file

**Files:**
- Create: `src/lib/booking/ics.ts`, `src/lib/booking/ics.test.ts`, `src/app/[locale]/(site)/bookings/[reference]/receipt/page.tsx`, `src/app/[locale]/(site)/bookings/[reference]/calendar/route.ts`
- Modify: `src/app/[locale]/(site)/bookings/[reference]/page.tsx`

**Interfaces:**
- Produces: `toIcs(e: { uid: string; title: string; start: IsoDate; end: IsoDate; location: string; description: string }): string`. All-day `DTSTART;VALUE=DATE`, CRLF line endings, `,` `;` `\` and newlines escaped, lines folded at 75 octets.

- [ ] **Step 1: Test** `toIcs`: starts with `BEGIN:VCALENDAR\r\n`, contains `DTSTART;VALUE=DATE:20261201`, escapes `Kimihurura, Kigali` as `Kimihurura\, Kigali`, and no line is longer than 75 octets.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Confirmation.** A placed booking is now a row, so the page reads it through `byReference` like any other. `JustBooked` stays only for old links that carry the query string. Add Print receipt (the receipt page, with a print stylesheet: logo, reference, lines, payments, VAT note), Add to calendar (the route returns `text/calendar`), Share, and the trip-cart offer from Task 29 in place of today's suggestion cards.
- [ ] **Step 4: Screenshot** the confirmation and the receipt's print preview (`--print-to-pdf`, then open the PDF and look at it).
- [ ] **Step 5: Commit.**

### Task 27: Managing a booking

**Files:**
- Create: `src/components/bookings/timeline.tsx`, `change-dates-dialog.tsx`, `cancel-dialog.tsx`, `add-guests-dialog.tsx`, `check-in-card.tsx`, `online-check-in.tsx`, `report-issue-dialog.tsx`, `extend-stay-dialog.tsx`, `review-form.tsx`, `deposit-status.tsx`, `src/app/actions/stay.ts`
- Modify: `src/app/[locale]/(site)/bookings/[reference]/page.tsx`, `src/lib/domain/types.ts`, `src/lib/repos/types.ts`, fixtures, `messages/*.json`

**Interfaces:**
- Produces: `type Incident = { id: string; bookingId: string; category: "power" | "water" | "internet" | "cleanliness" | "safety" | "noise" | "other"; urgency: "now" | "today" | "whenever"; description: string; photoName?: string; status: "open" | "inProgress" | "resolved"; createdAt: string; assignee?: string }`; `type Review = { id: string; bookingId: string; supplyId: string; ratings: Record<"cleanliness" | "accuracy" | "checkIn" | "communication" | "location" | "value", 1 | 2 | 3 | 4 | 5>; text: string; createdAt: string; guestFirstName: string }`; `IncidentsRepo { forBooking(id); all(); create(i); update(id, patch) }`; `ReviewsRepo { forSupply(id); create(r) }`. Actions: `reportIssue`, `submitReview`, `submitCheckIn(reference, adults: { name: string; idFileName: string }[])`, `extendStay(reference, newEnd)` (reuses `changeBookingDates`), `addGuests(reference, party)` (refused above `sleeps`, re-quoted).

The booking page shows sections by phase, using `today` in Kigali time and `checkInReleased`:
- **Before arrival:** timeline, change dates (the date picker with booked nights disabled, the `changeDifference`, then pay the difference through a compact pay step, or show the refund), add guests, cancel (`refundPreview` with its rule in words, a reason select, a confirm dialog), online check-in, and the check-in card locked with "Unlocks {date} at 14:00".
- **From release:** the check-in card shows directions, door code, wifi, the manager's name and the emergency line, from `Listing.checkIn` fixtures.
- **During the stay:** report a problem (creates an incident plus `newIncident` for ops), ask for something (an existing ask), extend.
- **After:** a review form if none exists, Book again, and for renting the deposit refund status (held, inspection booked, returned less deductions).

- [ ] **Step 1: Build** in that order, each as its own component reading booking props.
- [ ] **Step 2: Fixtures.** Seed one guest booking in each phase relative to `today()`: arriving in 5 days, arriving in 1 day (released), in the stay now, ended 3 days ago, and a long-term stay that has ended.
- [ ] **Step 3: Walk and screenshot** each phase as guest at 390 and 1440: change dates up and down, a cancellation inside 7 days (expect "half"), a report with a photo.
- [ ] **Step 4: Commit.**

### Task 28: The trip cart, as logic

**Files:**
- Create: `src/lib/cart.ts`, `src/lib/cart-checks.ts`, `src/lib/cart-checks.test.ts`

**Interfaces:**
- Produces:

```ts
// cart-checks.ts (pure)
export type CartItem = { id: string; kind: ServiceKind; slug: string; supplyId: string; title: string; start: IsoDate; end: IsoDate; party: number; driveMode?: DriveMode; bookedReference?: string; quote: Quote };
export type CartIssue = { code: "staysOverlap" | "carOutsideStay" | "dayOutsideStay" | "inPast"; itemIds: string[]; blocking: boolean };
export function cartIssues(items: CartItem[], today: IsoDate): CartIssue[];
export function cartBlocked(items: CartItem[], today: IsoDate): boolean;
export function cartTotal(items: CartItem[], currency: CurrencyCode, fx: FxTable): Money;   // sum of each unpaid item's displayed total; booked items excluded
export function cartTimeline(items: CartItem[]): { date: IsoDate; items: CartItem[] }[];   // by start date, then kind: stay, car, experience

// cart.ts (client, same pattern as saved.ts; key "homelink.cart.v1", event "homelink:cart")
export function useCart(): { enabled: boolean; items: CartItem[]; enable(seed?: CartItem): void; disable(): void; add(item: CartItem): void; remove(id: string): void; update(id: string, patch: Partial<CartItem>): void; clear(): void };
```

The server snapshot is `{ enabled: false, items: [] }`, so the cart is off for every first render and for every new device.

- [ ] **Step 1: Write the tests:**

```ts
it("blocks two stays that overlap by a night", () => { expect(issues([stay("12-01","12-05"), stay("12-04","12-08")])[0]).toMatchObject({ code: "staysOverlap", blocking: true }); });
it("lets two stays meet on a changeover day", () => { expect(issues([stay("12-01","12-05"), stay("12-05","12-08")])).toEqual([]); });
it("warns, without blocking, about a car outside the stay", () => { expect(issues([stay("12-01","12-05"), car("11-28","12-02")])[0]).toMatchObject({ code: "carOutsideStay", blocking: false }); });
it("warns about a day out on a day with no stay", () => { /* ... */ });
it("blocks anything in the past", () => { /* start before today */ });
it("never charges a booked item again", () => { expect(cartTotal([booked(stay(...)), car(...)], "RWF", fx)).toEqual(car(...).quote.total); });
it("adds totals in the display currency from each item's displayed total", () => { /* RWF + USD items shown in USD */ });
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS.
- [ ] **Step 3: Commit.** Say why the cart is off by default: most bookings are one thing, and a cart in front of them adds a step to every one of them.

### Task 29: The trip cart, on screen

**Files:**
- Create: `src/components/cart/plan-trip-cta.tsx`, `trip-pill.tsx`, `add-to-trip.tsx`, `trip-timeline.tsx`, `cart-issues.tsx`, `turn-off-dialog.tsx`, `src/app/[locale]/(site)/trip/page.tsx`, `src/app/[locale]/(site)/trip/checkout/page.tsx`, `src/app/actions/trips.ts`
- Modify: `src/components/listing/booking-panel.tsx`, `src/components/mobility/hire-panel.tsx`, `src/components/experiences/seats-panel.tsx`, `src/components/shell/site-header.tsx`, `src/components/shell/mobile-menu.tsx`, the confirmation page, `src/lib/repos/types.ts` (`TripRepo.create`), `messages/*.json` (`cart` namespace)

**Interfaces:**
- Consumes: Task 28, `FlowShell` (`flow: "trip"`), `placeBooking`.
- Produces: `placeTrip(input: { items: CartItem[]; draft: BookingDraft; clientTotal: Money; payment: PlaceBookingInput["payment"] }): Promise<{ ok: true; trip: Trip; bookings: Booking[] } | { ok: false; failed: { itemId: string; reason: "unavailable" | "invalid" | "priceChanged" }[] }>`. All or nothing: if any item fails, none is stored.

What it looks like:
- **`PlanTripCta`:** a full-width secondary button under Reserve, shown only once dates are picked and only while the cart is off. Copy: "Planning a full trip? Book a car and days out with it", with a one-line explainer that it is paid once and each part can still be cancelled on its own. It also replaces the "tripTitle" suggestion cards on the confirmation page, where it adds the just-booked stay as a booked item.
- **When on:**
  - `TripPill` appears in the header ("Trip · 3"; a dot and the count on phones), linking to `/trip`.
  - Every detail panel shows "Add to trip" as a secondary button beside the primary one, with dates prefilled from the first stay in the cart.
  - Adding toasts, with a link to `/trip`.
- **`/trip`:**
  - The timeline by day with each item's card (image, dates, party, total, remove, change) and `CartIssues` above it.
  - Suggestions for what is missing: no car yet, offer one; no day out, offer the three nearest.
  - The total in the display currency, and "Check out the whole trip", disabled with the reason while `cartBlocked`.
  - "Book items one at a time": opens `TurnOffDialog` when there are items, and clears and turns off on confirm.
- **`/trip/checkout`:** `FlowShell` with `flow: "trip"`. Details once, extras grouped per item, one review listing every item's rules and cancellation rule, and one payment for the sum. On success the cart clears and the page routes to the trip's page under `/trips`.

- [ ] **Step 1: Build** the components and pages.
- [ ] **Step 2: Walk it in Chrome** at 390 and 1440, and screenshot each step:
  1. Check the cart is invisible by default on a fresh profile: no pill, no Add to trip.
  2. Turn it on from a stay.
  3. Add a car with dates two days outside the stay; the warning shows.
  4. Add a day out.
  5. Add a second, overlapping stay; checkout blocks.
  6. Remove that stay and pay with Mobile Money.
  7. Check `/trips` shows the trip with three bookings.
  8. Turn the cart off with items in it; the dialog appears.
- [ ] **Step 3: Commit.**

---

# Part 4: Dashboards

### Task 30: My HomeLink, Trips and Payments for guests

**Files:**
- Create: `src/app/[locale]/(site)/account/page.tsx` (replaces the placeholder), `src/app/[locale]/(site)/account/payments/page.tsx`, `src/components/account/next-trip-card.tsx`, `payment-row.tsx`, `saved-methods.tsx`
- Modify: `src/app/[locale]/(site)/trips/page.tsx`, fixtures, `messages/*.json` (`account` namespace)

- [ ] **Step 1: Overview.**
  - `NextTripCard`: image, dates, "in 5 days", the check-in state (locked until the date, or ready), and actions for check-in details, message, and manage booking.
  - Short lists: the latest notifications (4) and recently viewed (from `recently-viewed.ts`).
  - Tiles: renting (rent due date and amount) and an upcoming viewing, each shown only when the guest has one.
  - An empty state for a guest with nothing booked.
- [ ] **Step 2: Trips.** Tabs Upcoming / Past / Cancelled in the URL; trips (cart purchases) grouped with their bookings; past items show Review or Book again.
- [ ] **Step 3: Payments.** Every `PaymentRecord` for the guest: date, what for, rail (card ending, or Mobile Money number masked to the last three digits), amount, status, receipt link; refunds shown as negative with their state. Saved methods are read-only here and managed in Task 45.
- [ ] **Step 4: Screenshot** each page at 390 and 1440, light and dark, including the empty states (as a fresh guest with no fixtures; add `?preview=empty` handling in the repo for guest reads only, documented as preview-only).
- [ ] **Step 5: Commit.**

### Task 31: Renting and viewings for guests

**Files:**
- Create: `src/app/[locale]/(site)/account/renting/page.tsx`, `src/app/[locale]/(site)/account/viewings/page.tsx`, `src/lib/workspace/schedules.ts`, `src/lib/workspace/schedules.test.ts`, `src/components/account/rent-schedule.tsx`, `maintenance-request-form.tsx`
- Modify: fixtures, `src/lib/repos/types.ts`, `messages/*.json`

**Interfaces:**
- Produces: `type RentInstalment = { due: IsoDate; amount: Money; status: "paid" | "due" | "overdue" | "upcoming"; paymentId?: string }`; `rentSchedule(start: IsoDate, months: number, monthly: Money, payments: PaymentRecord[], today: IsoDate): RentInstalment[]`. The due day is the start's day of month, clamped to the month's last day (31 January becomes 28 or 29 February). `due` covers today up to 5 days ahead, `overdue` is past due and unpaid. `type MaintenanceTicket = { id: string; listingId: string; bookingId?: string; title: string; description: string; photoName?: string; priority: "low" | "normal" | "urgent"; status: "open" | "scheduled" | "inProgress" | "done"; createdAt: string; assignee?: string; scheduledFor?: IsoDate; source: "tenant" | "guest" | "staff" | "inspection" }`; `WorkRepo { tickets(filter?: { listingId?: string; status?: MaintenanceTicket["status"][] }): Promise<MaintenanceTicket[]>; createTicket(t): Promise<MaintenanceTicket>; updateTicket(id, patch): Promise<MaintenanceTicket> }` (extended in Task 36).

- [ ] **Step 1: Test** `rentSchedule`: 12 instalments from `2026-01-31` fall on `2026-02-28`, `2026-03-31`, and so on; a paid instalment is `paid`; one 3 days past due is `overdue`; one due in 4 days is `due`.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Renting page.**
  - The home, the agreement (a download of the rendered agreement from Task 24) and the deposit held.
  - The rent schedule, with "Pay rent" on the due instalment (the compact pay step from Task 27).
  - Maintenance requests: a list plus a new-request form with a photo and priority, which creates a ticket and notifies ops.
  - Documents: the agreement, receipts, the move-in checklist.
- [ ] **Step 4: Viewings page.** Upcoming and past viewings, with reschedule and cancel (dialogs) and directions.
- [ ] **Step 5: Screenshot** and **commit.**

### Task 32: Workspace building blocks

**Files:**
- Create: `src/components/workspace/data-table.tsx`, `stat-tile.tsx`, `sparkline.tsx`, `bar-chart.tsx`, `filter-bar.tsx`, `empty-state.tsx`, `detail-drawer.tsx`
- Read first: the `dataviz` skill, before writing `sparkline.tsx` and `bar-chart.tsx`.

**Interfaces:**
- Produces:
  - `<DataTable columns rows rowHref? sort? emptyState />`. `columns` is `{ key; header; cell(row); align?; sortable?; hideBelow?: "sm" | "md" | "lg" }[]`. Sort state lives in `?sort=key` and `?dir=asc|desc`. Header sticky; below 640px each row renders as a card from the same columns.
  - `<StatTile label value delta? href? />`.
  - `<Sparkline points: number[] label />` and `<BarChart series: { label: string; value: number }[] format />`, both inline SVG with a text alternative and theme tokens.
  - `<FilterBar>` with search, selects and a date range, all writing to the URL.
  - `<DetailDrawer>`: a right-side panel that opens over a list on `?open=<id>`.
- [ ] **Step 1: Build them**, then exercise them on the first screen that needs them (Task 33) rather than on a demo page.
- [ ] **Step 2: Commit** with Task 33.

### Task 33: Today board (ops, admin)

**Files:**
- Create: `src/lib/workspace/day-board.ts`, `src/lib/workspace/day-board.test.ts`, `src/app/[locale]/(workspace)/manage/today/page.tsx`, `src/app/actions/desk.ts`

**Interfaces:**
- Produces: `dayBoard(bookings: Booking[], date: IsoDate): { arrivals: Booking[]; departures: Booking[]; inHouse: Booking[]; turnovers: { listingId: string; out: Booking; in: Booking }[] }` (stays only, not cancelled; a stay is in house when `start < date < end`); `turnoverTasks(bookings: Booking[], date: IsoDate): { listingId: string; date: IsoDate; from: "11:00"; until: "14:00" | "end of day"; nextBookingId?: string }[]`; `markCheckedIn(reference)` (sets `checkedInAt`, adds an event, releases escrow, notifies the guest), `markCheckedOut(reference)`.

- [ ] **Step 1: Test** `dayBoard`: an arrival and a departure on the same listing make one turnover; a cancelled booking is on no list; a guest leaving today is a departure, not in house; and the board for the Kigali day of `2026-11-08T22:30Z` is the board for `2026-11-09`.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Page.**
  - Four stat tiles that also filter the page.
  - Arrivals and departures as two columns, each row with guest, home, time, party, escrow state, and actions (check in, check out, message, open).
  - In house as a compact list, with turnovers highlighted.
  - Open asks and open incidents for today as short lists, linking to their pages.
  - A day picker (yesterday, today, tomorrow, or a date) in `?date=`.
- [ ] **Step 4: Screenshot** as ops and admin at 1440 and 1024, and check that the board has rows (the Task 27 fixtures are relative to today).
- [ ] **Step 5: Commit.**

### Task 34: Bookings list and staff booking detail

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/bookings/page.tsx`, `src/app/[locale]/(workspace)/manage/bookings/[reference]/page.tsx`, `src/components/workspace/booking-staff-actions.tsx`
- Modify: `src/app/actions/bookings.ts`, `src/app/api/search/route.ts` and `src/components/search/smart-search.tsx` (staff results)

- [ ] **Step 1: List.** `DataTable` with reference (monospace), guest, what, dates, status, total, escrow, paid; `FilterBar` with status, lane, dates and search by reference, guest name or email; 25 per page.
- [ ] **Step 2: Detail.** Everything the guest sees plus:
  - The full timeline, payments and refunds, and staff notes (add a note).
  - Actions: resend confirmation (a notification plus a toast), change dates or party on the guest's behalf, cancel with a choice of policy refund or a full goodwill refund (admin only), and refund part of a payment (admin only, with an amount and reason).
  - Links to the thread and incidents.
  - Every action records an audit entry.
- [ ] **Step 3: Staff search.** For ops and admin, the ⌘K palette also matches booking references (`HL-` prefix or 4+ characters of one), guest names and property names, and opens the staff detail.
- [ ] **Step 4: Screenshot** and **commit.**

### Task 35: Asks, inspections, inbox and incidents

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/asks/page.tsx`, `inspections/page.tsx`, `inbox/page.tsx`, `incidents/page.tsx`, `src/app/actions/queue.ts`
- Move: the tab bodies of `(site)/queue/page.tsx` into components under `src/components/queue/` used by these pages; then `(site)/queue/page.tsx` keeps only its redirect, and `(site)/messages/page.tsx` redirects workspace roles to `/manage/inbox`.

- [ ] **Step 1: Asks.** Today's asks list with a status flow (open, quoted, arranged, declined), owner assignment, and quoting a price that the guest sees in their thread.
- [ ] **Step 2: Inspections.** The verification queue with scheduling (date and inspector), an inspection checklist with point count and notes, and publish (for a new candidate this creates a draft listing that admin finishes in the editor).
- [ ] **Step 3: Inbox.** The existing thread list and view inside the workspace frame: two panes from 1024px, one below. Drivers and guides see only their threads.
- [ ] **Step 4: Incidents.** From guest reports: urgency first, assign, status, and convert to a maintenance ticket.
- [ ] **Step 5: Screenshot** each page and **commit.** Say the queue's tabs became pages because each now has its own actions and filters.

### Task 36: Housekeeping and maintenance

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/housekeeping/page.tsx`, `maintenance/page.tsx`, `src/app/actions/work.ts`
- Modify: `src/lib/repos/types.ts` (`WorkRepo` gains `housekeeping(date: IsoDate): Promise<HousekeepingTask[]>` and `updateHousekeeping(id, patch)`), fixtures

**Interfaces:**
- Produces: `type HousekeepingTask = { id: string; listingId: string; date: IsoDate; kind: "turnover" | "midStay" | "deep"; window: { from: string; until: string }; assignee?: string; status: "todo" | "inProgress" | "ready" | "issue"; note?: string }`. Turnovers come from `turnoverTasks`; mid-stay cleans come from booked `midStayClean` extras.

- [ ] **Step 1: Housekeeping.** Today's tasks by property with windows, assign a cleaner (fixture staff), status chips, and "ready", which tells ops the home is ready for the arrival. Filtered by the admin property switcher.
- [ ] **Step 2: Maintenance.** Tickets as a list grouped by status (open, scheduled, in progress, done) with priority, source and age; a detail drawer with schedule, assignee, notes and a photo; a new ticket form; blocking the home's dates while work is on (`availability.block` with reason `maintenance`).
- [ ] **Step 3: Screenshot** and **commit.**

### Task 37: Admin overview

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/overview/page.tsx`, `src/lib/workspace/metrics.ts`, `src/lib/workspace/metrics.test.ts`

**Interfaces:**
- Produces: `occupancy(bookings: Booking[], listingId: string, from: IsoDate, to: IsoDate): number` (booked nights clipped to the range divided by nights in the range, 0 to 1, cancelled excluded); `revenue(bookings: Booking[], from: IsoDate, to: IsoDate, currency: CurrencyCode, fx: FxTable): Money` (bookings placed in range, net of refunds); `weeklySeries(bookings, weeks: number, today: IsoDate): number[]`.

- [ ] **Step 1: Test** `occupancy`: a stay half inside the range counts only its inside nights; a cancelled stay counts 0; a fully booked range is 1.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Page.**
  - Tiles: bookings this week, occupancy for the next 30 days, revenue this month, open incidents, overdue rent.
  - A 12-week bookings sparkline.
  - Occupancy per property as a bar chart.
  - Today's numbers from `dayBoard`.
  - A to-do list built from open items: unpublished inspections, documents expiring, refunds awaiting approval.
- [ ] **Step 4: Screenshot** light and dark at 1440 and 1024, and **commit.**

### Task 38: Portfolio and the listing editor

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/portfolio/page.tsx`, `src/app/[locale]/(workspace)/manage/portfolio/[slug]/page.tsx`, `src/components/workspace/listing-editor/*.tsx` (one per tab), `src/app/actions/portfolio.ts`, `src/components/workspace/unsaved-guard.tsx`
- Modify: `src/lib/repos/types.ts` (`StaysRepo.update(id: string, patch: ListingPatch): Promise<Listing>`, `StaysRepo.create(draft: NewListing): Promise<Listing>`, `StaysRepo.setPublished(id, published: boolean)`), fixtures (`Listing.published: boolean`, default true)

**Interfaces:**
- Produces: `type ListingPatch = Partial<Pick<Listing, "name" | "summary" | "amenities" | "houseRules" | "nightlyRate" | "monthlyRate" | "leaseTerms" | "modes" | "images" | "propertyManager" | "checkIn" | "bedrooms" | "sleeps">> & { minNights?: number }`. `updateListing(id, patch)` validates the patch (non-empty name, rates above zero, sleeps >= bedrooms, at least one mode), saves, records audit, and revalidates the public page.

- [ ] **Step 1: Portfolio.** A table and card grid toggle: photo, name, neighbourhood, modes, occupancy for the next 30 days, next arrival, open tickets, published state. "New listing" creates an unpublished draft.
- [ ] **Step 2: Editor tabs**, in the URL:
  - Details: name, summary, rooms, sleeps.
  - Photos: reorder by drag and by keyboard (move up and down buttons), set the cover, remove, add by `FileDrop` as a local preview with a note that Phase 2 uploads.
  - Amenities.
  - House rules: an ordered list editor.
  - Pricing: nightly, monthly, minimum nights, renting terms.
  - Availability: a month calendar where admin blocks and unblocks dates, with booked nights read-only.
  - Check-in details.
  - Manager.
  - Inspection record: read-only, with a link to inspections.

  Each tab has Save and Discard. `UnsavedGuard` warns in an in-page dialog when leaving a tab with changes, and uses `beforeunload` only for closing the browser tab.
- [ ] **Step 3: Prove a write reaches the site.** Change a nightly rate in the editor, then open the public stay page and screenshot the new rate; unpublish it and check it is gone from `/stays` and search (the local engine reads the store; Meilisearch needs `make search-reset`, so the commit should say so).
- [ ] **Step 4: Commit.**

### Task 39: Calendar and rates

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/calendar/page.tsx`, `rates/page.tsx`, `src/components/workspace/multi-calendar.tsx`, `rate-grid.tsx`
- Modify: `src/lib/repos/types.ts` (`RatesRepo { forRange(listingId, from, to): Promise<{ date: IsoDate; rate: Money }[]>; setRange(listingId, from, to, rate: Money): Promise<void> }`), `quoteStay` to read per-night rates when they are set (tested in `booking-pricing.test.ts`: a stay across a rate change sums both rates)

- [ ] **Step 1: Test** the per-night rate change in `quoteStay`, run it to see it fail, implement it, then run it to see it pass.
- [ ] **Step 2: Calendar.** Properties as rows and 14 or 30 days as columns (`?span=`), with booking bars labelled by guest, blocked days hatched, and today marked. Clicking a bar opens the staff booking; clicking an empty cell (admin) blocks it; ops sees it read-only. The grid scrolls horizontally inside its own frame with the property column sticky; the page itself must not scroll sideways (measure `scrollWidth`).
- [ ] **Step 3: Rates.** A week-by-week grid per property; select a range and set a rate; weekend rows shaded; the current base rate shown for comparison.
- [ ] **Step 4: Screenshot** at 1440 and 1024, and at 390 to confirm the inner scroll, and **commit.**

### Task 40: Tenants, homes for sale and partners

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/tenants/page.tsx`, `sales/page.tsx`, `partners/page.tsx`, `partners/[id]/page.tsx`
- Modify: `src/lib/repos/types.ts` (`PartnersRepo { list(); byId(id); documents(partnerId); jobs(filter?) }`), `SalesRepo.update`, fixtures (two drivers and two guides as `Partner = { id: string; role: "driver" | "guide"; name: string; phone: string; supplyIds: string[]; rating: number; joinedAt: IsoDate }`)

- [ ] **Step 1: Tenants.** The rent roll: tenant, home, monthly rent, next due date, status from `rentSchedule` (overdue first), deposit held, agreement end date, with actions to send a reminder (a `rentDue` notification), record a payment received by bank transfer, and start a move-out (inspection plus deposit return).
- [ ] **Step 2: Homes for sale.** Listings with status (on the market, under offer, sold), the viewing requests list with confirm, reschedule and mark done (each notifies the guest), and an edit form for price and status.
- [ ] **Step 3: Partners.** Drivers and guides with their vehicles or days out, rating, upcoming jobs and document expiry; the detail page assigns a job and shows payouts.
- [ ] **Step 4: Screenshot** and **commit.**

### Task 41: Finance

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/finance/page.tsx`, `src/components/workspace/finance/*.tsx` (one per tab), `src/app/actions/finance.ts`
- Modify: `src/lib/repos/types.ts` (`FinanceRepo { payments(filter?); refunds(); deposits(); payouts(); reconcile(paymentId, providerRef): Promise<void>; approveRefund(id); releaseDeposit(bookingId, deductions: Money, reason: string); markPayoutPaid(id) }`), fixtures (Mobile Money statement lines, some matched and some not)

- [ ] **Step 1: Tabs** in `?tab=`:
  - Revenue: by lane and by month, as `BarChart` plus a table.
  - Payments: incoming, with filter by rail and status.
  - Reconciliation: Mobile Money statement lines beside payments, with matched, unmatched and suggested-match rows and a match action.
  - Refunds: awaiting approval, approved, paid.
  - Deposits held: escrow on stays and renting deposits, with release, including deductions and a reason.
  - Payouts: drivers and guides only, held / due / paid, mark paid.
  - Invoices: a list linking to receipts.
- [ ] **Step 2: Rules.** Releasing a deposit with deductions requires a reason and shows the guest-facing sentence before confirming. Every action is audited.
- [ ] **Step 3: Screenshot** each tab and **commit.**

### Task 42: People, content, settings and the audit log

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/people/page.tsx`, `content/page.tsx`, `settings/page.tsx`, `audit/page.tsx`, `src/app/actions/admin.ts`
- Modify: `src/lib/domain/extras.ts` and `src/lib/domain/promo.ts` (read prices and codes from the store when set, falling back to the constants; the Task 15 tests still pass), `src/lib/repos/types.ts` (`AdminRepo { staff(); invite(email, role); setRole(staffId, role); settings(); updateSettings(patch); audit(filter?) }`)

- [ ] **Step 1: People.** Staff and partners with role, last active and status; invite by email with a role (ops, admin, driver, guide); change role, refusing to demote the last admin (test this in `admin.test.ts`); deactivate.
- [ ] **Step 2: Content.** Neighbourhood profiles (text, photo, landmarks shown), the landing page's featured stays (pick and order), and announcements (a banner on the site with start and end dates).
- [ ] **Step 3: Settings.**
  - Policies: the refund windows, editable as numbers.
  - The extras catalogue: prices and on/off.
  - Promo codes: create with a percent, cap, expiry and lane.
  - Display FX rates, with a note that settlement rates come from the provider.
  - Notification templates: per kind, the text in four languages, read-only in this pass.
  - The bank transfer details.
- [ ] **Step 4: Audit log.** Every audit entry, newest first: who (role), what, target linking to the thing, and when, in Kigali time. Filters by actor, action and date, and an export as CSV generated in the browser.
- [ ] **Step 5: Screenshot** and **commit.**

### Task 43: Partner screens for drivers and guides

**Files:**
- Create: `src/app/[locale]/(workspace)/manage/jobs/page.tsx`, `schedule/page.tsx`, `earnings/page.tsx`, `documents/page.tsx`, `src/app/actions/partner.ts`, `src/lib/workspace/expiry.ts`, `src/lib/workspace/expiry.test.ts`
- Modify: `src/lib/repos/types.ts` (`Job = { id: string; partnerId: string; bookingId: string; kind: "hire" | "transfer" | "dayOut"; start: string; end: string; pickup: string; party: number; status: "offered" | "accepted" | "declined" | "done"; offerExpiresAt?: string; pay: Money }`; `PartnersRepo.respond(jobId, accept: boolean)`), fixtures; delete `(site)/inventory/page.tsx`'s old body, keeping the redirect

**Interfaces:**
- Produces: `expiryState(expires: IsoDate, today: IsoDate): "valid" | "expiringSoon" | "expired"` (30 days or fewer is expiring soon; on the day itself it is expired).

- [ ] **Step 1: Test** `expiryState` at 31, 30, 1 and 0 days.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Jobs.** Offers first, each with pickup, time, party, pay and a countdown to `offerExpiresAt`, plus Accept and Decline (decline asks for a reason). Below that: accepted upcoming jobs, then done. Accepting notifies ops.
- [ ] **Step 4: Schedule, earnings and documents.**
  - Schedule: an agenda by day for the next 14 days.
  - Earnings: payouts held, due and paid, with totals for this month and last.
  - Documents: licence, insurance and vehicle inspection (drivers), or guide certification (guides), each with `expiryState`, upload of a replacement, and a `documentExpiring` notification seeded for one.
- [ ] **Step 5: Screenshot** at 390 with bottom tabs, and at 1440, and **commit.**

---

# Part 5: Sign-in, settings and help

### Task 44: Sign-in screens

**Files:**
- Create: `src/lib/auth/safe-next.ts`, `src/lib/auth/safe-next.test.ts`, `src/app/[locale]/(site)/sign-in/page.tsx`, `sign-up/page.tsx`, `verify/page.tsx`, `forgot/page.tsx`, `check-email/page.tsx`, `src/components/auth/*.tsx` (`otp-input.tsx`, `provider-buttons.tsx`, `auth-card.tsx`)
- Modify: `src/components/shell/account-menu.tsx` (`SignInLink` goes to `/sign-in?next=<current path>`), `src/components/shell/signed-out.tsx`

**Interfaces:**
- Produces: `safeNext(next: string | undefined, locale: Locale): string`. It returns `next` only when it starts with a single `/`, does not start with `//` or `/\`, contains no scheme, and stays under `/${locale}/`; otherwise it returns `/${locale}/account`.

- [ ] **Step 1: Test:**

```ts
it("keeps a path on this site", () => { expect(safeNext("/en/trips", "en")).toBe("/en/trips"); });
it("refuses other sites", () => {
  for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/fr/trips"])
    expect(safeNext(bad, "en")).toBe("/en/account");
});
it("falls back when there is none", () => { expect(safeNext(undefined, "rw")).toBe("/rw/account"); });
```

- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Screens.**
  - Sign in: tabs for phone and email. Phone sends a code and goes to Verify; email offers a password or a sign-in link, and the link goes to Check email.
  - Google and Apple buttons.
  - Sign up: name, phone or email, language, and accept terms.
  - Verify: 6 boxes that accept a paste of the whole code, auto-advance, a resend with a 30-second cooldown, and a wrong-code state (`000000` is wrong; anything else passes).
  - Forgot password.
  - Completing any of them sets the preview role to `guest` and goes to `safeNext(next)`.
  - A quiet "Work at HomeLink?" link opens a role picker for the preview (ops, admin, driver, guide), clearly labelled as a preview tool.
- [ ] **Step 4: Screenshot** each screen at 390 and 1440, light and dark, and **commit.**

### Task 45: Account settings and ID verification

**Files:**
- Create: `src/app/[locale]/(site)/account/settings/page.tsx` (profile), `settings/security/page.tsx`, `settings/payment-methods/page.tsx`, `settings/preferences/page.tsx`, `settings/privacy/page.tsx`, `account/verify-id/page.tsx`, `src/components/account/settings-nav.tsx`, `src/app/actions/account.ts`
- Modify: `src/components/shell/preference-controls.tsx` (the controls are reused on the preferences page), `src/lib/repos/types.ts` (`AccountRepo { profile(); updateProfile(p); methods(); addMethod(m); removeMethod(id); setDefault(id); sessions(); signOutOthers(); idCheck(); submitIdCheck(input) }`)

- [ ] **Step 1: Profile.** Name, email, phone (each change "sends a code" to verify, via the Verify screen), photo (`FileDrop`), and emergency contact.
- [ ] **Step 2: Security.** Password, active sessions (device, city, last active) with sign-out for each and for all others, and two-step sign-in on or off.
- [ ] **Step 3: Payment methods.** Cards (brand and last four, expiry) and Mobile Money numbers (provider from `momoProvider`, masked), set default, remove (confirm dialog), add (the pay-step fields).
- [ ] **Step 4: Preferences and privacy.** Preferences: language, currency, theme and segment, the same controls as the header menu. Privacy: download my data (a JSON file built in the browser from the guest's fixtures) and delete my account (type "DELETE" in the active language, a dialog, then a signed-out confirmation; blocked while a booking is upcoming, with the reason).
- [ ] **Step 5: ID verification.** Document type (national ID, passport, driving licence), front and back (`FileDrop`), a selfie (`FileDrop` with `capture="user"` on phones), then a status of pending, verified or needs another photo. A preview control cycles the status. The renting flow's application step links here.
- [ ] **Step 6: Screenshot** each page and **commit.**

### Task 46: Help, contact, legal and reviews

**Files:**
- Create: `src/app/[locale]/(site)/help/page.tsx`, `help/[article]/page.tsx`, `contact/page.tsx`, `legal/terms/page.tsx`, `legal/privacy/page.tsx`, `legal/cancellation/page.tsx`, `src/lib/help/articles.ts` (articles as data, keyed by message ids), `src/components/listing/reviews.tsx`, `src/components/ui/prose.tsx`
- Modify: `src/components/shell/site-footer.tsx`, the stay, car and day-out detail pages (reviews section), fixtures (reviews), `messages/*.json`

- [ ] **Step 1: Help centre.** A search across article titles and bodies in the active language, then six categories (booking and paying, changing and cancelling, check-in and your stay, renting a home, cars and drivers, days out), with 4 to 6 articles each. Articles state the policy numbers from the store, so they match the settings.
- [ ] **Step 2: Contact.** A form (topic, booking reference optional and validated against the guest's bookings, message), WhatsApp and phone as links, and an emergency line shown prominently to a guest who is in a stay now.
- [ ] **Step 3: Legal pages.** Terms, privacy, and the cancellation policy, rendered from the same numbers as `policies.ts`. Mark the legal text in the page source as placeholder for a lawyer to replace.
- [ ] **Step 4: Reviews.** On detail pages: the average and six category bars, then reviews with first name, month and text, 6 at a time with "show more". The section is hidden with a sentence when there are fewer than 3 reviews ("New to HomeLink", rather than one review standing for the place).
- [ ] **Step 5: Footer.** Help, Contact, Terms, Privacy, Cancellation, and the four language links.
- [ ] **Step 6: Screenshot** and **commit.**

### Task 47: The full sweep

**Files:**
- Create: `scripts/sweep.mjs` (extends `route-smoke.mjs`: every route in this plan, per role, both themes, at 390, 1024 and 1440, in the four locales for the 10 busiest screens; scrolls and waits for images before each capture, per the earlier spec's trap)
- Modify: `docs/superpowers/specs/2026-11-08-booking-workspace-design.md` (status and findings), `docs/superpowers/specs/2026-08-10-real-data-milestone.md` (status line: paused behind this pass), `AGENTS.md` ("Where the work is")

- [ ] **Step 1: Run the sweep**, then open every capture. Look for clipped text (long French and Swahili strings especially), horizontal scroll, contrast in dark mode, empty states that are actually broken, and any visible "lease".
- [ ] **Step 2: Fix what it finds**, one commit per kind of problem, each with the reasoning.
- [ ] **Step 3: Write the findings** into the spec under "Review and fixes", including what was measured and any trap a later session would otherwise rediscover.
- [ ] **Step 4: Run** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Expected: all pass, with lint showing 0 errors.
- [ ] **Step 5: Commit**, and update the memory note that this pass is done.
