import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * An honest placeholder.
 *
 * The shell exists to be walked end to end, so every link has to land
 * somewhere. This says plainly that the screen is scaffolding rather than
 * pretending to be finished — a fake-looking empty state would be worse than
 * an admitted gap.
 */
export async function NotBuiltYet({ title }: { title: string }) {
  const t = await getTranslations("empty");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
        {t("comingSoon")}
      </p>
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="max-w-[56ch] text-ink-2">{t("comingSoonBody")}</p>
      <Link
        href="/"
        className="mt-2 self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← HomeLink
      </Link>
    </div>
  );
}
