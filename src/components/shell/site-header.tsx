import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { PreferenceControls } from "./preference-controls";
import { VerticalTabs } from "./vertical-tabs";

export async function SiteHeader() {
  const t = await getTranslations("header");

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        {t("skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-[1180px] items-center gap-6 px-6 py-2">
          <Link href="/" className="flex-none rounded-ctl">
            <Logo />
          </Link>

          {/* Centred and absolutely placed so the tabs stay optically centred
              on the page rather than on whatever space the logo leaves. */}
          <div className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex">
            <div className="pointer-events-auto">
              <VerticalTabs />
            </div>
          </div>

          <div className="ml-auto">
            <PreferenceControls />
          </div>
        </div>
      </header>
    </>
  );
}
