"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { usePreferences, type ThemeChoice } from "@/lib/preferences/context";
import { useDismissable } from "@/lib/use-dismissable";
import {
  CheckIcon,
  ChevronDownIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Language, currency and theme, behind one button.
 *
 * They used to be three bordered controls side by side, which with search,
 * saved and the account menu made six boxes of equal weight in the bar — a
 * toolbar where nothing led. They are all "how the page reads", none of them
 * is where anyone is going, and they change rarely. One quiet button that
 * says the current state ("EN · USD") answers "what am I looking at" without
 * a click, and one menu holds all three.
 *
 * The same panel is the bottom half of the phone menu, which is also how
 * language and currency stopped being unreachable below 640px.
 */

const THEMES: { value: ThemeChoice; icon: typeof SunIcon }[] = [
  { value: "system", icon: MonitorIcon },
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
];

export function PreferencesPanel({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { currency, setCurrency, theme, setTheme } = usePreferences();

  const themeLabel: Record<ThemeChoice, string> = {
    system: t("themeSystem"),
    light: t("themeLight"),
    dark: t("themeDark"),
  };

  const heading = "px-2 pb-1 text-[12px] font-medium text-ink-3";
  const segment = (selected: boolean) =>
    cn(
      "h-8 cursor-pointer rounded-inner transition-colors duration-150",
      selected
        ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(12,33,25,0.08)]"
        : "text-ink-3 hover:text-ink",
    );

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("language")} className="flex flex-col gap-0.5">
        <p className={heading}>{t("language")}</p>
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === locale}
            disabled={isPending}
            onClick={() => {
              if (l !== locale) {
                // Language is the URL, so switching it is a navigation. The
                // query rides along: switching to French on a filtered result
                // set should not throw the filters away.
                startTransition(() => {
                  router.replace(`${pathname}${window.location.search}`, { locale: l });
                });
              }
              onDone?.();
            }}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2 rounded-inner px-2 text-left text-sm transition-colors duration-150",
              l === locale ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <span className="flex-1">{LOCALE_LABELS[l]}</span>
            <span className="font-mono text-[12px] text-ink-3">{l.toUpperCase()}</span>
            <CheckIcon size={14} className={cn("text-brand", l !== locale && "invisible")} />
          </button>
        ))}
      </div>

      <div role="group" aria-label={t("currency")} className="flex flex-col gap-0.5">
        <p className={heading}>{t("currency")}</p>
        <div className="grid grid-cols-4 gap-1 rounded-ctl bg-surface-2 p-1">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === currency}
              onClick={() => setCurrency(c as CurrencyCode)}
              className={cn(segment(c === currency), "font-mono text-[12px]")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label={t("theme")} className="flex flex-col gap-0.5">
        <p className={heading}>{t("theme")}</p>
        <div className="grid grid-cols-3 gap-1 rounded-ctl bg-surface-2 p-1">
          {THEMES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === theme}
              onClick={() => setTheme(value)}
              className={cn(segment(value === theme), "flex items-center justify-center gap-1.5 text-[13px]")}
            >
              <Icon size={14} />
              {themeLabel[value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PreferencesMenu({ className }: { className?: string }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const { currency } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(ref, open, close);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t("preferences")}: ${locale.toUpperCase()}, ${currency}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-ctl px-2.5 font-mono text-[13px] transition-colors duration-150",
          open ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {/* Fixed width per slot, so switching RWF for USD does not shift the
            bar under the pointer that just made the change. */}
        <span className="inline-block w-[2ch]">{locale.toUpperCase()}</span>
        <span aria-hidden className="text-ink-3">·</span>
        <span className="inline-block w-[3ch]">{currency}</span>
        <ChevronDownIcon size={13} className={cn("text-ink-3 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("preferences")}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-card border border-line bg-surface p-3 shadow-[var(--shadow-pop)] animate-[rise_180ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <PreferencesPanel onDone={close} />
        </div>
      )}
    </div>
  );
}
