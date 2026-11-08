"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { homeFor } from "@/lib/workspace/nav";
import { FOOTER_LINK } from "./footer-link";

/**
 * The footer's "yours" column, for whoever is reading.
 *
 * It said "Your trip: Saved, Trips, Messages" to every role, so a host was
 * offered trips they never booked and ops had no way back to the queue. It
 * follows the same role-derived destinations as the account menu.
 *
 * A client component reading the preferences context rather than the server
 * reading the role cookie: the footer is on every page, and `cookies()` in the
 * layout would opt the whole product out of static rendering.
 */
export function FooterAccountColumn() {
  const t = useTranslations("footer");
  const tHeader = useTranslations("header");
  const { role } = usePreferences();
  const home = homeFor(role);

  const { title, links } = home
    ? {
        title: role === "driver" || role === "guide" ? t("yoursSupply") : t("yoursOps"),
        links: [
          { href: home, label: tHeader("workspace") },
          { href: "/manage/inbox", label: tHeader("messages") },
        ],
      }
    : {
        title: t("yours"),
        links: [
          { href: "/saved", label: t("saved") },
          { href: "/trips", label: tHeader("trips") },
          { href: "/messages", label: tHeader("messages") },
        ],
      };

  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-[12px] font-medium text-ink-3">{title}</h2>
      <ul className="flex flex-col gap-0.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={FOOTER_LINK}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
