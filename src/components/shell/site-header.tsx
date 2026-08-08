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
        {/*
          A three-column grid rather than absolute positioning. The tabs were
          taken out of flow to centre them, which meant they contributed no
          height — the header collapsed to the logo's height and the taller
          tabs spilled past its edge with nothing above them.
          `1fr auto 1fr` centres the tabs on the page, not on whatever space
          the logo happens to leave, and they still set the header's height.
        */}
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_auto] items-center gap-4 px-6 py-3 md:grid-cols-[1fr_auto_1fr]">
          <Link href="/" className="justify-self-start rounded-ctl">
            <Logo />
          </Link>

          <div className="col-span-2 row-start-2 flex justify-center md:col-span-1 md:row-start-1">
            <VerticalTabs />
          </div>

          <div className="justify-self-end md:col-start-3">
            <PreferenceControls />
          </div>
        </div>
      </header>
    </>
  );
}
