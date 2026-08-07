"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { usePreferences, type ThemeChoice } from "@/lib/preferences/context";
import {
  BanknoteIcon,
  ChevronDownIcon,
  GlobeIcon,
  MonitorIcon,
  MoonIcon,
  PinIcon,
  PlaneIcon,
  SunIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * One grouped control, not four floating boxes.
 *
 * These are utilities, not navigation: they should be findable and then get
 * out of the way. Four separately bordered pills gave them the same visual
 * weight as the primary nav and still left "English / RWF / System" unlabelled
 * until you opened them. Collapsing the chrome into a single bordered object
 * with hairline dividers, and letting an icon carry the meaning, drops the
 * weight without hiding anything.
 */

/**
 * A borderless select that inherits the group's chrome.
 *
 * The native control stays underneath — it is fully keyboard accessible and
 * gets the platform's own picker on mobile, which is better than anything
 * hand-rolled. The visible row is the icon, the value, and the caret; the
 * select sits transparently on top of it.
 */
function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  display,
  disabled,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  icon: React.ReactNode;
  display: (value: T) => string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5 px-3 text-ink-2",
        "transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        "focus-within:outline focus-within:outline-2 focus-within:outline-brand focus-within:-outline-offset-2",
        disabled && "opacity-60",
        className,
      )}
    >
      {icon}
      {/* Presentational: the select underneath already announces its value,
          so leaving this readable would have it read out twice. */}
      <span aria-hidden="true" className="text-[13px] font-semibold">
        {display(value)}
      </span>
      <ChevronDownIcon className="text-ink-3" />

      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {display(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Language is the URL, so switching it is a navigation, not a state change. */
function LocaleControl() {
  const t = useTranslations("header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <SelectControl
      label={t("language")}
      value={locale}
      options={routing.locales}
      disabled={isPending}
      onChange={(next) =>
        startTransition(() => {
          router.replace(pathname, { locale: next });
        })
      }
      icon={<GlobeIcon />}
      /* Uppercase tag, not the full endonym: "Kinyarwanda" is 11 characters
         and would set the width of the whole group. Full names stay in the
         open menu, where there is room for them. */
      display={(l) => l.toUpperCase()}
      className="hidden h-9 sm:flex"
    />
  );
}

/** Currency is independent of language: read in Kinyarwanda, pay in USD. */
function CurrencyControl() {
  const t = useTranslations("header");
  const { currency, setCurrency } = usePreferences();

  return (
    <SelectControl
      label={t("currency")}
      value={currency}
      options={CURRENCIES}
      onChange={(next: CurrencyCode) => setCurrency(next)}
      icon={<BanknoteIcon />}
      display={(c) => c}
      className="hidden h-9 sm:flex"
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
        "grid h-9 w-10 cursor-pointer place-items-center text-ink-2",
        "transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {icons[theme]}
    </button>
  );
}

/**
 * The segment override. Product & UX §4 requires this visible and persistent,
 * never buried in settings — it changes currency and payment rail, which are
 * the two things a user most needs to correct about our guess.
 *
 * It stays a visible two-state toggle rather than joining the dropdowns
 * because it is the only control here that changes what the product does, not
 * just how it reads.
 */
function SegmentControl() {
  const t = useTranslations("segment");
  const { segment, setSegment } = usePreferences();

  const options = [
    { value: "abroad", label: t("abroad"), icon: <PlaneIcon /> },
    { value: "rwanda", label: t("rwanda"), icon: <PinIcon /> },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex h-9 items-center p-0.5"
    >
      {options.map((option) => {
        const active = segment === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.label}
            onClick={() => setSegment(option.value)}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5",
              "text-[13px] font-semibold transition-colors duration-150",
              active
                ? "bg-brand-tint text-brand"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {option.icon}
            <span className="hidden lg:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PreferenceControls() {
  return (
    <div className="flex items-center divide-x divide-line overflow-hidden rounded-ctl border border-line bg-surface">
      <SegmentControl />
      <LocaleControl />
      <CurrencyControl />
      <ThemeControl />
    </div>
  );
}
