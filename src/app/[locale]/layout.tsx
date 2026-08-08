import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { NUMBER_LOCALES, routing, type Locale } from "@/i18n/routing";
import { repos } from "@/lib/repos";
import { PreferencesProvider } from "@/lib/preferences/context";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { PreviewBar } from "@/components/shell/preview-bar";
import { ThemeScript } from "@/components/shell/theme-script";

import "../globals.css";

/**
 * Display serif. Chosen over Playfair (reads bridal) and Lora (reads blog):
 * Fraunces has optical sizing and warmth without costume.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

/**
 * UI face. Deliberately not Inter — Instrument runs slightly narrower, which
 * buys real column width in dense result rows.
 */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

/** For anything read aloud to support: refs, ledger amounts, IDs. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });

  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const fx = await repos().fx.rates();

  // Language implies a starting segment; the user overrides it from the header.
  // Phase 2 replaces this with the IP/geo signal from Product & UX §4.
  const initialSegment = locale === "rw" ? "rwanda" : "abroad";

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${instrumentSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <NextIntlClientProvider>
          <PreferencesProvider
            numberLocale={NUMBER_LOCALES[locale as Locale]}
            fx={fx}
            initialSegment={initialSegment}
          >
            <SiteHeader />
            <main id="content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            <PreviewBar />
          </PreferencesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
