# HomeLink: Brainstorm & Planning Docs

Working name: **HomeLink**, concierge-verified accommodation, cars, and tours for people coming to (and living in) Rwanda.

This directory holds the pre-build brainstorm output, prepared for a team review session.

## Contents

| # | Document | Purpose |
|---|---|---|
| 01 | [Lean Canvas, Summary](01-lean-canvas/homelink-lean-canvas-summary.md) | One-page snapshot (grid canvas in the `.docx`) |
| 01 | [Lean Canvas, Detailed](01-lean-canvas/homelink-lean-canvas-detailed.md) | Expanded companion, what each block means and why |
| 02 | [Product & UX Definition](02-product-and-ux/homelink-product-ux.md) | Services, domain model, intent routing, journeys, messaging, i18n, MVP scope, roadmap |
| 03 | [Technical Plan](03-technical-plan/homelink-technical-plan.md) | Architecture, stack, data model, payments, messaging, build sequencing, risks |

Each document is provided as both `.md` (editable source of truth) and `.docx` (for team review and sharing).

## Locked decisions (as of this brainstorm)

- **Beachhead:** returning diaspora and tourists as the paying focus; everyday Rwandans on core rent and car.
- **Supply:** concierge or managed launch, personally verified, guaranteed inventory.
- **Revenue:** stack of booking commission (headline), property-management %, car and tour margin, bundle markup, and FX spread.
- **Payments:** full rails (cards and Mobile Money, both directions, multi-currency, escrow).
- **MVP (V1):** the full arrival bundle (stay, car, tour) plus in-app messaging, with a documented pressure-release valve.
- **UX:** intent routing over a browsable feed; **booking atomic, Trip optional**; segment-native localization.
- **Tech:** modular monolith with service seams; React PWA on **Next.js or TanStack Start** (decision open, Next.js recommended); **Supabase** backend (Postgres, Auth, Storage, Realtime, Edge Functions); provider-abstracted payments; realtime messaging.

## Regenerating the `.docx` files

The `.docx` files are generated from the `.md` sources. See `_tools/` for the generators:
- `generate_canvas_docx.py` rebuilds both Lean Canvas `.docx` (summary grid plus detailed).
- `render_report.py` rebuilds a report `.docx` from its `.md` (used for Product & UX and Technical Plan).
