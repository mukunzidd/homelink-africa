import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("brand");

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-6 py-10">
        <Logo />
        <p className="max-w-[52ch] text-sm text-ink-2">{t("tagline")}</p>
      </div>
    </footer>
  );
}
