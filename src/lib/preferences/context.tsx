"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CurrencyCode, FxTable, Money } from "@/lib/domain/money";
import { convert, formatMoney } from "@/lib/domain/money";
import type { Role, Segment, SegmentDefaults } from "@/lib/domain/types";

/**
 * Everything the user can override about how the product presents itself.
 *
 * Product & UX §4: language, currency, payment rail, content emphasis, and the
 * default flow all key off segment — and every one of them is overridable.
 * Language lives in the URL (next-intl owns it); the rest lives here.
 *
 * Role is mocked. In Phase 2 it comes from Supabase Auth claims, and this hook
 * is the only thing that has to change.
 */

export type ThemeChoice = "system" | "light" | "dark";

export const SEGMENT_DEFAULTS: Record<Segment, SegmentDefaults> = {
  abroad: { currency: "USD", rail: "card", tripPromptsOn: true },
  rwanda: { currency: "RWF", rail: "mobileMoney", tripPromptsOn: false },
};

type PreferencesValue = {
  segment: Segment;
  setSegment: (s: Segment) => void;

  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;

  role: Role;
  setRole: (r: Role) => void;

  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;

  rail: SegmentDefaults["rail"];
  tripPromptsOn: boolean;

  /** Display-only rates. Callers needing multi-line conversion use these
   *  through `toDisplayQuote`, so line items always sum to their total. */
  fx: FxTable;

  /** Convert into the display currency and format for the active locale. */
  display: (m: Money) => string;
  /** Convert without formatting, when the caller needs the raw Money. */
  toDisplayCurrency: (m: Money) => Money;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

const STORAGE_KEY = "homelink.preferences";

type Persisted = {
  segment?: Segment;
  currency?: CurrencyCode;
  role?: Role;
  theme?: ThemeChoice;
};

function readPersisted(): Persisted {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function PreferencesProvider({
  children,
  intlLocale,
  fx,
  initialSegment,
}: {
  children: React.ReactNode;
  intlLocale: string;
  fx: FxTable;
  initialSegment: Segment;
}) {
  const [segment, setSegmentState] = useState<Segment>(initialSegment);
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    SEGMENT_DEFAULTS[initialSegment].currency,
  );
  const [role, setRoleState] = useState<Role>("visitor");
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  // Rehydrate after mount. Server and first client render must agree, so the
  // stored values are applied in an effect rather than during render.
  useEffect(() => {
    const stored = readPersisted();
    if (stored.segment) setSegmentState(stored.segment);
    if (stored.currency) setCurrencyState(stored.currency);
    if (stored.role) setRoleState(stored.role);
    if (stored.theme) setThemeState(stored.theme);
  }, []);

  const persist = useCallback((patch: Persisted) => {
    if (typeof window === "undefined") return;
    const next = { ...readPersisted(), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  /** Changing segment resets currency to that segment's default, not silently. */
  const setSegment = useCallback(
    (s: Segment) => {
      const nextCurrency = SEGMENT_DEFAULTS[s].currency;
      setSegmentState(s);
      setCurrencyState(nextCurrency);
      persist({ segment: s, currency: nextCurrency });
    },
    [persist],
  );

  const setCurrency = useCallback(
    (c: CurrencyCode) => {
      setCurrencyState(c);
      persist({ currency: c });
    },
    [persist],
  );

  const setRole = useCallback(
    (r: Role) => {
      setRoleState(r);
      persist({ role: r });
    },
    [persist],
  );

  const setTheme = useCallback(
    (t: ThemeChoice) => {
      setThemeState(t);
      persist({ theme: t });
    },
    [persist],
  );

  const value = useMemo<PreferencesValue>(() => {
    const toDisplayCurrency = (m: Money) => convert(m, currency, fx);
    return {
      segment,
      setSegment,
      currency,
      setCurrency,
      role,
      setRole,
      theme,
      setTheme,
      rail: SEGMENT_DEFAULTS[segment].rail,
      tripPromptsOn: SEGMENT_DEFAULTS[segment].tripPromptsOn,
      fx,
      toDisplayCurrency,
      display: (m: Money) => formatMoney(toDisplayCurrency(m), intlLocale),
    };
  }, [segment, currency, role, theme, fx, intlLocale, setSegment, setCurrency, setRole, setTheme]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return ctx;
}
