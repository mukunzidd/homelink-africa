import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LOCALE_LABELS, routing } from "@/i18n/routing";
import { Logo } from "./logo";
import { FooterAccountColumn } from "./footer-account-column";
import { FOOTER_LINK } from "./footer-link";

/**
 * Every link here goes somewhere that exists. A footer column of "Careers",
 * "Press" and "Blog" pointing at nothing is the commonest way a young product
 * tells a visitor it is younger than it claims.
 */
export async function SiteFooter() {
  const t = await getTranslations("brand");
  const tFooter = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  const columns = [
    {
      title: tFooter("explore"),
      links: [
        { href: "/stays", label: tFooter("stayLink") },
        { href: "/stays?band=long", label: tFooter("rentLink") },
        { href: "/buy", label: tFooter("buyLink") },
        { href: "/cars", label: tNav("cars") },
        { href: "/experiences", label: tNav("experiences") },
      ],
    },
    {
      title: tFooter("kigali"),
      links: [
        { href: "/neighbourhoods/kimihurura", label: "Kimihurura" },
        { href: "/neighbourhoods/kiyovu", label: "Kiyovu" },
        { href: "/neighbourhoods/nyarutarama", label: "Nyarutarama" },
        { href: "/neighbourhoods/remera", label: "Remera" },
        { href: "/neighbourhoods", label: tFooter("allNeighbourhoods") },
      ],
    },
    {
      title: tFooter("helpTitle"),
      links: [
        { href: "/help", label: tFooter("help") },
        { href: "/contact", label: tFooter("contact") },
        { href: "/legal/cancellation", label: tFooter("cancellation") },
        { href: "/legal/terms", label: tFooter("terms") },
        { href: "/legal/privacy", label: tFooter("privacy") },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-[36ch] text-sm leading-relaxed text-ink-2">{t("tagline")}</p>
          <p className="max-w-[40ch] text-[13px] leading-relaxed text-ink-3">{tFooter("promise")}</p>
        </div>
        {columns.map((col, i) => (
          <Fragment key={col.title}>
            {/* The role-aware column sits second, where "Your trip" always was. */}
            {i === 1 && <FooterAccountColumn />}
            <nav aria-label={col.title} className="flex flex-col gap-3">
              <h2 className="text-[12px] font-medium text-ink-3">{col.title}</h2>
              <ul className="flex flex-col gap-0.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={FOOTER_LINK}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Fragment>
        ))}
      </div>
      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-[12px] text-ink-3">
          <span>{tFooter("rights", { year: 2026 })}</span>
          {/* Each language's home page, named in itself, so someone who cannot read the current one can still find theirs. */}
          <nav aria-label={tFooter("languages")} className="flex flex-wrap gap-x-4 gap-y-1">
            {routing.locales.map((l) => (
              <Link key={l} href="/" locale={l} lang={l} className="hover:text-ink">
                {LOCALE_LABELS[l]}
              </Link>
            ))}
          </nav>
          <span>{tFooter("prices")}</span>
        </div>
      </div>
    </footer>
  );
}
