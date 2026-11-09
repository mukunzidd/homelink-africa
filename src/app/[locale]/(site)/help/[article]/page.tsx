import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { ARTICLES, helpNumbers } from "@/lib/help/articles";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Paragraphs, Prose } from "@/components/ui/prose";

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article } = await params;
  if (!ARTICLES.some((a) => a.slug === article)) return {};
  return { title: (await getTranslations("help.articles"))(`${article}.title`) };
}

export default async function HelpArticle({ params }: { params: Promise<{ locale: string; article: string }> }) {
  const { locale, article } = await params;
  setRequestLocale(locale);
  const a = ARTICLES.find((x) => x.slug === article);
  if (!a) notFound();
  const [t, ta] = await Promise.all([getTranslations("help"), getTranslations("help.articles")]);
  const n = helpNumbers((await repos().admin.settings()).catalog);
  const related = ARTICLES.filter((x) => x.category === a.category && x.slug !== a.slug);
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <Breadcrumbs trail={[{ label: t("title"), href: "/help" }, { label: t(`categories.${a.category}`) }]} />
      <article className="flex flex-col gap-5">
        <h1 className="max-w-[24ch] font-display text-4xl font-semibold leading-tight text-ink">{ta(`${a.slug}.title`)}</h1>
        <Prose><Paragraphs text={ta(`${a.slug}.body`, n)} /></Prose>
      </article>
      <aside className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-[15px] font-semibold text-ink">{t("related")}</h2>
        <ul className="flex flex-col gap-1.5">
          {related.map((r) => <li key={r.slug}><Link href={`/help/${r.slug}`} className="text-[15px] text-brand hover:underline">{ta(`${r.slug}.title`)}</Link></li>)}
        </ul>
        <p className="mt-3 text-[15px] text-ink-2">{t("stillStuck")} <Link href="/contact" className="font-semibold text-brand hover:underline">{t("askUs")}</Link></p>
      </aside>
    </div>
  );
}
