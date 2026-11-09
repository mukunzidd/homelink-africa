"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SearchIcon } from "@/components/ui/icons";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Every article's title and text in the page's language, searched as you type. */
export function HelpSearch({ articles }: { articles: { slug: string; title: string; text: string }[] }) {
  const t = useTranslations("help");
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const words = fold(q).split(/\s+/).filter((w) => w.length >= 2);
    if (!words.length) return [];
    return articles
      .map((a) => ({ a, score: words.reduce((n, w) => n + (fold(a.title).includes(w) ? 3 : 0) + (fold(a.text).includes(w) ? 1 : 0), 0) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
      .map((x) => x.a);
  }, [q, articles]);
  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="min-h-14 w-full rounded-card border border-line bg-surface pl-11 pr-4 text-[16px] text-ink shadow-[var(--shadow-card)] placeholder:text-ink-3 focus:border-brand focus:outline-none" />
      </label>
      {q.trim().length >= 2 && (
        <ul aria-live="polite" className="flex flex-col rounded-card border border-line bg-surface">
          {hits.map((a) => (
            <li key={a.slug} className="border-t border-line-soft first:border-0">
              <Link href={`/help/${a.slug}`} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-2">
                <span className="text-[15px] font-semibold text-ink">{a.title}</span>
                <span className="line-clamp-1 text-[13px] text-ink-3">{a.text}</span>
              </Link>
            </li>
          ))}
          {!hits.length && <li className="px-4 py-3 text-[14px] text-ink-3">{t("noHits")} <Link href="/contact" className="font-semibold text-brand hover:underline">{t("askUs")}</Link></li>}
        </ul>
      )}
    </div>
  );
}
