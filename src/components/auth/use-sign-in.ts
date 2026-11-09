"use client";

import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { safeNext } from "@/lib/auth/safe-next";
import type { Locale } from "@/i18n/routing";

/**
 * Finishing any sign-in in the preview: become the guest, then go where
 * the link said, if that is somewhere on this site. setRole writes the
 * role cookie before the push, so the next server render already reads
 * it. Phase 2 swaps the first line for a real session.
 */
export function useCompleteSignIn() {
  const locale = useLocale() as Locale;
  const params = useSearchParams();
  const { setRole } = usePreferences();
  const router = useRouter();
  const next = params.get("next") ?? undefined;
  // Links inside the app carry next without the locale ("/trips"); add it.
  const withLocale = next && next.startsWith("/") && !next.startsWith(`/${locale}`) && !next.startsWith("//") ? `/${locale}${next}` : next;
  return {
    next: withLocale,
    finish() {
      setRole("guest");
      router.push(safeNext(withLocale, locale));
      router.refresh();
    },
  };
}

/** Keeps ?next= on links between the sign-in screens. */
export function useNextQuery() {
  const params = useSearchParams();
  const next = params.get("next");
  return next ? `next=${encodeURIComponent(next)}` : "";
}
