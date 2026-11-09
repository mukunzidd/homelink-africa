import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * The 404, inside the site's own header and footer.
 *
 * It offers the lanes rather than only "home", because someone who followed a
 * stale listing link usually still wants the thing the listing was: a place,
 * a car, or a day out.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  const lanes = [
    { href: "/stays", label: t("stays") },
    { href: "/stays?band=long", label: t("rent") },
    { href: "/buy", label: t("buy") },
    { href: "/cars", label: t("cars") },
    { href: "/experiences", label: t("experiences") },
  ];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1180px] flex-col justify-center gap-5 px-6 py-16">
      <p className="font-mono text-[13px] text-ink-3">404</p>
      <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold text-ink sm:text-5xl">{t("title")}</h1>
      <p className="max-w-[56ch] text-[16px] leading-relaxed text-ink-2">{t("body")}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-deep"
        >
          {t("home")}
        </Link>
        {lanes.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-11 items-center rounded-ctl border border-line bg-surface px-4 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
