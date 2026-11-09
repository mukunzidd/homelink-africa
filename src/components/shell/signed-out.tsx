"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CalendarIcon, MessageIcon } from "@/components/ui/icons";

/**
 * A signed-out guest on Trips or Messages.
 *
 * The footer links to both, and a visitor who followed one was told "This
 * screen belongs to someone else", which reads like an error. A later version
 * showed greyed, dashed placeholder cards of what the page would hold; in a
 * browser sweep they read as a page still loading. This is a plain empty state
 * instead: what the page is for, and the way in.
 *
 * There are no accounts yet, so signing in assumes the preview's guest role.
 * The hint beside the button says "preview" and no more; how the preview works
 * is the preview bar's business, not this page's.
 */
export function SignedOut({ screen }: { screen: "trips" | "messages" | "booking" }) {
  const t = useTranslations("signedOut");
  const pathname = usePathname();
  const Icon = screen === "messages" ? MessageIcon : CalendarIcon;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col px-6 py-14 sm:py-20">
      <div className="flex max-w-[44ch] flex-col items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full border border-line text-ink-2"
        >
          <Icon size={22} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold text-ink">{t(`${screen}.title`)}</h1>
          <p className="text-[15px] leading-relaxed text-ink-2">{t(`${screen}.body`)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/sign-in?next=${encodeURIComponent(pathname)}`}
            className="inline-flex min-h-11 items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
          >
            {t("signIn")}
          </Link>
          <Link href={`/sign-up?next=${encodeURIComponent(pathname)}`} className="text-[14px] font-semibold text-brand hover:underline">
            {t("createAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
