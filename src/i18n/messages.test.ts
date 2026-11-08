import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Four message files, one shape.
 *
 * next-intl falls back silently on a missing key at runtime, so a string
 * forgotten in one language shows up as a raw key on somebody's screen weeks
 * later. This catches it at the commit instead.
 */

type Tree = { [key: string]: string | Tree };

const LOCALES = ["en", "fr", "rw", "sw"] as const;
type L = (typeof LOCALES)[number];

const cache = new Map<L, Map<string, string>>();

function flat(locale: L): Map<string, string> {
  const hit = cache.get(locale);
  if (hit) return hit;
  const file = fileURLToPath(new URL(`../../messages/${locale}.json`, import.meta.url));
  const tree = JSON.parse(readFileSync(file, "utf8")) as Tree;
  const out = new Map<string, string>();
  const walk = (node: Tree, prefix: string) => {
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") out.set(path, v);
      else walk(v, path);
    }
  };
  walk(tree, "");
  cache.set(locale, out);
  return out;
}

const keys = (l: L) => [...flat(l).keys()].sort();
const values = (l: L) => [...flat(l).values()];

/**
 * The top-level ICU arguments of a message: `{name}` and the argument of
 * `{count, plural, ...}`, but not the `{...}` branches inside a plural.
 */
function placeholders(l: L, key: string): string[] {
  const s = flat(l).get(key) ?? "";
  const found = new Set<string>();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && /['{}]/.test(s[i + 1] ?? "")) {
      // ICU quoting starts only before a brace or another apostrophe, so
      // "jusqu'au {date}" keeps its placeholder; "'{'" is a literal brace.
      const end = s.indexOf("'", i + 1);
      if (end > i + 1) {
        i = end;
        continue;
      }
    }
    if (c === "{") {
      if (depth === 0) {
        const m = /^\{\s*([A-Za-z0-9_]+)\s*[,}]/.exec(s.slice(i));
        if (m) found.add(m[1]);
      }
      depth++;
    } else if (c === "}") {
      depth--;
    }
  }
  return [...found].sort();
}

describe("message files", () => {
  it("every locale has exactly the English keys", () => {
    for (const l of LOCALES.slice(1)) {
      const en = new Set(keys("en"));
      const other = new Set(keys(l));
      const missing = [...en].filter((k) => !other.has(k));
      const extra = [...other].filter((k) => !en.has(k));
      expect({ locale: l, missing, extra }).toEqual({ locale: l, missing: [], extra: [] });
    }
  });

  it("every translation keeps the English placeholders", () => {
    const wrong: string[] = [];
    for (const l of LOCALES.slice(1)) {
      for (const k of keys("en")) {
        if (!flat(l).has(k)) continue;
        if (placeholders(l, k).join() !== placeholders("en", k).join()) wrong.push(`${l}:${k}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("never says lease to a reader", () => {
    // Rwandans use the word less and less; the copy says renting, a long-term
    // stay, and a rental agreement. Code identifiers keep `lease`.
    expect(values("en").filter((v) => /\blease/i.test(v))).toEqual([]);
    expect(values("fr").filter((v) => /\bbail\b|\bbaux\b/i.test(v))).toEqual([]);
  });

  it("no string is empty", () => {
    const empty: string[] = [];
    for (const l of LOCALES) for (const [k, v] of flat(l)) if (!v.trim()) empty.push(`${l}:${k}`);
    expect(empty).toEqual([]);
  });
});
