#!/usr/bin/env node
/**
 * Request every public route in every locale and print the ones that do not
 * answer as expected. Silence means every route is fine.
 *
 *   node scripts/route-smoke.mjs            # against http://localhost:3100
 *   BASE=http://localhost:3000 node scripts/route-smoke.mjs
 *
 * Not a test: it needs a running server, and it is for moves that should
 * change nothing (route groups, layout splits) where the claim to check is
 * "every URL still answers the same".
 */
const BASE = process.env.BASE ?? "http://localhost:3100";
const LOCALES = ["en", "fr", "rw", "sw"];

const PATHS = [
  ["/", 200],
  ["/stays", 200],
  ["/stays?band=long", 200],
  ["/stays/kimihurura-convention-studio", 200],
  ["/stays/kimihurura-convention-studio/book?from=2026-12-01&to=2026-12-05&party=2", 200],
  ["/buy", 200],
  ["/cars", 200],
  ["/experiences", 200],
  ["/neighbourhoods", 200],
  ["/neighbourhoods/Kimihurura", 200],
  ["/saved", 200],
  ["/trips", 200],
  ["/messages", 200],
  ["/queue", 200],
  ["/inventory", 200],
  ["/no-such-page", 404],
];

let bad = 0;
for (const locale of LOCALES) {
  for (const [path, want] of PATHS) {
    const url = `${BASE}/${locale}${path === "/" ? "" : path}`;
    const res = await fetch(url, { redirect: "manual" });
    if (res.status !== want) {
      bad++;
      console.log(`${res.status} (want ${want})  ${url}`);
    }
  }
}
process.exit(bad ? 1 : 0);
