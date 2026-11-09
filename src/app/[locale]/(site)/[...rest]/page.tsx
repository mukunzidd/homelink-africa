import { notFound } from "next/navigation";

/**
 * Any path under a locale that no route claims.
 *
 * Without this, an unknown URL fell through to Next's root not-found, which
 * renders outside `[locale]/layout.tsx` — and the root layout here is a
 * pass-through with no `<html>`, so visitors got a runtime error instead of a
 * page. Routing them into `notFound()` here lands them on the localised
 * `[locale]/not-found.tsx`, inside the real header and footer.
 */
export default function CatchAll() {
  notFound();
}
