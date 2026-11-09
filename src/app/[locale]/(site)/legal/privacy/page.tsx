import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { helpNumbers } from "@/lib/help/articles";
import { Link } from "@/i18n/navigation";
import { Paragraphs, Prose } from "@/components/ui/prose";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("legal.privacy"))("title") };
}

/**
 * PLACEHOLDER LEGAL TEXT. Written to describe what the product actually
 * does, in plain words, so the screens can be reviewed. A lawyer replaces
 * every sentence in `legal.privacy` before launch; the numbers come from the
 * same settings the booking code uses, so they stay true when it changes.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("legal");
  const n = helpNumbers((await repos().admin.settings()).catalog);
  const sections = ["what", "why", "who", "keep", "rights", "contact"];
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-[13px] text-ink-3">{t("updated")}</p>
        <h1 className="font-display text-4xl font-semibold text-ink">{t("privacy.title")}</h1>
        <p className="max-w-[66ch] rounded-ctl bg-warn-tint px-3 py-2 text-[13.5px] text-warn">{t("draft")}</p>
      </header>
      <Prose>
        <p>{t("privacy.intro", n)}</p>
        {sections.map((s) => (
          <section key={s} className="flex flex-col gap-3">
            <h2>{t(`privacy.${s}.title`)}</h2>
            <Paragraphs text={t(`privacy.${s}.body`, n)} />
          </section>
        ))}
      </Prose>
      <nav className="flex flex-wrap gap-4 border-t border-line pt-5 text-[14px]">
        <Link href="/legal/terms" className="font-semibold text-brand hover:underline">{t("terms.title")}</Link>
        <Link href="/legal/privacy" className="font-semibold text-brand hover:underline">{t("privacy.title")}</Link>
        <Link href="/legal/cancellation" className="font-semibold text-brand hover:underline">{t("cancellation.title")}</Link>
        <Link href="/help" className="font-semibold text-brand hover:underline">{t("help")}</Link>
      </nav>
    </div>
  );
}
