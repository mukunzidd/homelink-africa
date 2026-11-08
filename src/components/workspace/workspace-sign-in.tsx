"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Role } from "@/lib/domain/types";
import { usePreferences } from "@/lib/preferences/context";
import { Logo } from "@/components/shell/logo";

const ROLES: Role[] = ["ops", "admin", "driver", "guide"];

/**
 * A signed-out visitor at /manage.
 *
 * There are no accounts yet, so "sign in" here is the preview: pick the role
 * to look at the workspace as. Said as a preview, the same way the guest
 * screens say it, so nobody mistakes it for a login form.
 */
export function WorkspaceSignIn() {
  const t = useTranslations("workspace");
  const tRoles = useTranslations("roles");
  const tSignedOut = useTranslations("signedOut");
  const { setRole } = usePreferences();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-canvas">
      <header className="flex h-14 items-center border-b border-line bg-surface px-5">
        <Link href="/" className="rounded-ctl">
          <Logo />
        </Link>
      </header>
      <main id="content" className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-6 py-14 sm:py-20">
        <div className="flex max-w-[46ch] flex-col items-start gap-4">
          <h1 className="font-display text-3xl font-semibold text-ink">{t("signInTitle")}</h1>
          <p className="text-[15px] leading-relaxed text-ink-2">{t("signInBody")}</p>
          <p className="mt-2 text-[13px] font-medium text-ink-3">{t("signInAs")}</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  router.refresh();
                }}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-ctl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:border-brand hover:text-brand"
              >
                {tRoles(r)}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-ink-3">{tSignedOut("previewNote")}</p>
        </div>
      </main>
    </div>
  );
}
