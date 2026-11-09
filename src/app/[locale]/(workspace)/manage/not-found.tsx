import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * A 404 inside the workspace, so a mistyped reference keeps the sidebar and
 * the way back, instead of dropping the desk onto a blank page.
 */
export default async function WorkspaceNotFound() {
  const t = await getTranslations("workspace");
  return (
    <div className="flex min-h-[50vh] max-w-[60ch] flex-col justify-center gap-4">
      <p className="font-mono text-[13px] text-ink-3">404</p>
      <h1 className="font-display text-3xl font-semibold text-ink">{t("notFoundTitle")}</h1>
      <p className="text-[15px] text-ink-2">{t("notFoundBody")}</p>
      <Link href="/manage" className="inline-flex min-h-11 items-center self-start rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
        {t("label")}
      </Link>
    </div>
  );
}
