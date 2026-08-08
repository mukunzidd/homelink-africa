"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { usePreferences, type ThemeChoice } from "@/lib/preferences/context";
import { Select } from "@/components/ui/select";
import {
  BanknoteIcon,
  GlobeIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Display preferences only: language, currency, theme.
 *
 * The segment toggle used to sit here too, which gave a choice that changes
 * *what the product does* — currency and payment rail — the same weight as
 * one that only changes how it reads. It now lives in the preview bar.
 */

/** Language is the URL, so switching it is a navigation, not a state change. */
function LocaleControl() {
  const t = useTranslations("header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    /* The trigger shows the uppercase tag because "Kinyarwanda" is 11
       characters and would set the width of the whole group. The open list
       shows full endonyms, where there is room for them. */
    <Select
      label={t("language")}
      hideLabel
      size="sm"
      value={locale}
      disabled={isPending}
      icon={<GlobeIcon size={15} />}
      options={routing.locales.map((l) => ({
        value: l,
        label: l.toUpperCase(),
        hint: LOCALE_LABELS[l],
      }))}
      onChange={(next) =>
        startTransition(() => {
          router.replace(pathname, { locale: next as Locale });
        })
      }
      className="hidden w-[104px] sm:block"
    />
  );
}

/** Currency is independent of language: read in Kinyarwanda, pay in USD. */
function CurrencyControl() {
  const t = useTranslations("header");
  const { currency, setCurrency } = usePreferences();

  return (
    <Select
      label={t("currency")}
      hideLabel
      size="sm"
      value={currency}
      icon={<BanknoteIcon size={15} />}
      options={CURRENCIES.map((c) => ({ value: c, label: c }))}
      onChange={(next) => setCurrency(next as CurrencyCode)}
      className="hidden w-[104px] sm:block"
    />
  );
}

const THEME_ORDER: ThemeChoice[] = ["system", "light", "dark"];

/**
 * Icon only, and it cycles.
 *
 * Three states do not justify a labelled dropdown — the icon states the
 * current mode, and the accessible name spells it out for anyone who needs it.
 */
function ThemeControl() {
  const t = useTranslations("header");
  const { theme, setTheme } = usePreferences();

  const labels: Record<ThemeChoice, string> = {
    system: t("themeSystem"),
    light: t("themeLight"),
    dark: t("themeDark"),
  };

  const icons: Record<ThemeChoice, React.ReactNode> = {
    system: <MonitorIcon />,
    light: <SunIcon />,
    dark: <MoonIcon />,
  };

  return (
    <button
      type="button"
      aria-label={`${t("theme")}: ${labels[theme]}`}
      title={labels[theme]}
      onClick={() =>
        setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length])
      }
      className={cn(
        "grid h-9 w-9 cursor-pointer place-items-center rounded-ctl border border-line bg-surface",
        "text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {icons[theme]}
    </button>
  );
}

export function PreferenceControls() {
  return (
    /* The controls carry their own borders now that two of them open
       popovers — a shared outer frame would clip the menus. */
    <div className="flex items-center gap-1.5">
      <LocaleControl />
      <CurrencyControl />
      <ThemeControl />
    </div>
  );
}
