import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { parseStaySearch } from "@/lib/search-params";
import { SearchPill } from "@/components/search/search-pill";
import { ListingCard } from "@/components/listing/listing-card";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tVerify = await getTranslations("verification");

  const [featured, allStays, destinations] = await Promise.all([
    repos().stays.featured(6),
    repos().stays.list(),
    repos().stays.neighbourhoodsWithCounts(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-14 px-6 py-12">
      {/*
        One question above the fold, not four. The intent doors and the
        duration selector both used to live here, asking about the same
        decision the search pill and the header tabs now carry between them.
      */}
      <section className="flex flex-col items-center gap-6 text-center">
        <VerifiedBadge label={tVerify("badge")} />

        <h1 className="max-w-[16ch] text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          {t("heroTitle")}
        </h1>

        <p className="max-w-[54ch] text-lg leading-relaxed text-ink-2">
          {t("heroBody")}
        </p>

        <div className="mt-2 w-full">
          <SearchPill
            search={parseStaySearch({})}
            destinations={destinations}
            variant="hero"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
          <span>{tTrust("listingsVerified", { count: allStays.length })}</span>
          <span className="text-ink-3">·</span>
          <span>{tTrust("escrowProtected")}</span>
          <span className="text-ink-3">·</span>
          <span>{tTrust("noSurprises")}</span>
        </div>
      </section>

      <section aria-labelledby="feed-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2
              id="feed-heading"
              className="font-display text-2xl font-semibold text-ink"
            >
              {t("feedTitle")}
            </h2>
            <p className="text-sm text-ink-2">{t("feedBody")}</p>
          </div>
          <Link
            href="/stays"
            className="rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("viewAll")} →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
