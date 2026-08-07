import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { PreferenceControls } from "./preference-controls";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const tNav = await getTranslations("nav");

  const links = [
    { href: "/stays", label: tNav("stays") },
    { href: "/cars", label: tNav("cars") },
    { href: "/experiences", label: tNav("experiences") },
  ] as const;

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        {t("skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-6 px-6 py-3">
          <Link href="/" className="flex-none rounded-ctl">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-ctl px-3 py-2 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <PreferenceControls />
          </div>
        </div>
      </header>
    </>
  );
}
