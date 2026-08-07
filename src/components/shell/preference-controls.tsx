"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { usePreferences, type ThemeChoice } from "@/lib/preferences/context";
import { cn } from "@/lib/cn";

const selectClass = cn(
  "appearance-none rounded-ctl border border-line bg-surface",
  "py-2 pl-3 pr-8 text-sm font-medium text-ink-2 cursor-pointer",
  "hover:text-ink hover:bg-surface-2 transition-colors duration-150 min-h-9",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22><path d=%22M3 4.5L6 7.5L9 4.5%22 fill=%22none%22 stroke=%22%236E8177%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/></svg>')]",
  "bg-[length:12px_12px] bg-[position:right_10px_center] bg-no-repeat",
);

/** Language is the URL, so switching it is a navigation, not a state change. */
export function LocaleSwitcher() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="contents">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className={cn(selectClass, isPending && "opacity-60")}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Currency is independent of language: read in Kinyarwanda, pay in USD. */
export function CurrencySwitcher() {
  const t = useTranslations("header");
  const { currency, setCurrency } = usePreferences();

  return (
    <label className="contents">
      <span className="sr-only">{t("currency")}</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className={selectClass}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ThemeToggle() {
  const t = useTranslations("header");
  const { theme, setTheme } = usePreferences();

  const options: { value: ThemeChoice; label: string }[] = [
    { value: "system", label: t("themeSystem") },
    { value: "light", label: t("themeLight") },
    { value: "dark", label: t("themeDark") },
  ];

  return (
    <label className="contents">
      <span className="sr-only">{t("theme")}</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeChoice)}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The segment override. Product & UX §4 requires this to be visible and
 * persistent, never buried in settings — it changes currency and payment rail,
 * which are the two things a user most needs to correct about our guess.
 */
export function SegmentSwitcher() {
  const t = useTranslations("segment");
  const { segment, setSegment } = usePreferences();

  return (
    <div className="inline-flex rounded-ctl border border-line bg-surface p-0.5">
      {(["abroad", "rwanda"] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={segment === s}
          onClick={() => setSegment(s)}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
            segment === s
              ? "bg-brand-tint text-brand"
              : "text-ink-3 hover:text-ink",
          )}
        >
          {t(s)}
        </button>
      ))}
    </div>
  );
}
