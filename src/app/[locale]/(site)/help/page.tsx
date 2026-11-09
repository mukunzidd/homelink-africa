import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { ARTICLES, HELP_CATEGORIES, helpNumbers } from "@/lib/help/articles";
import { Link } from "@/i18n/navigation";
import { HelpSearch } from "@/components/help/help-search";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("help"))("title") };
}

/** Search first, then six shelves of short articles, then a way to reach a person. */
export default async function Help({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, ta] = await Promise.all([getTranslations("help"), getTranslations("help.articles")]);
  const n = helpNumbers((await repos().admin.settings()).catalog);
  const all = ARTICLES.map((a) => ({ slug: a.slug, category: a.category, title: ta(`${a.slug}.title`), text: ta(`${a.slug}.body`, n).replace(/\n+/g, " ") }));
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 py-10">
      <header className="flex max-w-[720px] flex-col gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">{t("title")}</h1>
        <p className="text-[17px] text-ink-2">{t("intro")}</p>
        <HelpSearch articles={all} />
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_CATEGORIES.map((c) => (
          <section key={c} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <h2 className="text-[17px] font-semibold text-ink">{t(`categories.${c}`)}</h2>
            <ul className="flex flex-col gap-2">
              {all.filter((a) => a.category === c).map((a) => (
                <li key={a.slug}><Link href={`/help/${a.slug}`} className="text-[15px] text-ink-2 hover:text-brand hover:underline">{a.title}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-[15px] text-ink-2">{t("stillStuck")} <Link href="/contact" className="font-semibold text-brand hover:underline">{t("askUs")}</Link></p>
    </div>
  );
}
