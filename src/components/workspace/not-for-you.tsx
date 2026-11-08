import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldIcon } from "@/components/ui/icons";

/**
 * A door that is not this person's, said plainly and with somewhere to go.
 *
 * Two cases. A guest who found a /manage link is not staff at all, and is
 * sent back to their own account. A member of staff whose role lacks one
 * section stays in the workspace, and is told who can change that.
 */
export async function NotForYou({ kind }: { kind: "guest" | "section" }) {
  const t = await getTranslations("workspace");
  const guest = kind === "guest";
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-14 sm:py-20">
      <div className="flex max-w-[46ch] flex-col items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full border border-line text-ink-2"
        >
          <ShieldIcon size={22} />
        </span>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {guest ? t("notForGuestTitle") : t("notForYouTitle")}
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          {guest ? t("notForGuestBody") : t("notForYouBody")}
        </p>
        <Link
          href={guest ? "/trips" : "/manage"}
          className="mt-2 inline-flex min-h-11 items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
        >
          {guest ? t("toYourAccount") : t("label")}
        </Link>
      </div>
    </div>
  );
}
