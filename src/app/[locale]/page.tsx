import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { IntentDoors } from "@/components/landing/intent-doors";
import { DurationSelector } from "@/components/landing/duration-selector";
import { ListingCard } from "@/components/listing/listing-card";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StaySearchBar } from "@/components/search/stay-search-bar";
import { parseStaySearch } from "@/lib/search-params";

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

  const [featured, allStays, neighbourhoods] = await Promise.all([
    repos().stays.featured(6),
    repos().stays.list(),
    repos().stays.neighbourhoods(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-16 px-6 py-12">
      {/* Hero — discovery density: room, serif, the promise stated plainly. */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <VerifiedBadge label={tVerify("badge")} className="self-start" />
          <h1 className="max-w-[18ch] text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-[58ch] text-lg leading-relaxed text-ink-2">
            {t("heroBody")}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
          <span>{tTrust("listingsVerified", { count: allStays.length })}</span>
          <span className="text-ink-3">·</span>
          <span>{tTrust("escrowProtected")}</span>
          <span className="text-ink-3">·</span>
          <span>{tTrust("noSurprises")}</span>
        </div>

        {/* The same control that sits above results, so what someone picks
            here survives the jump instead of being asked for twice. */}
        <StaySearchBar
          search={parseStaySearch({})}
          neighbourhoods={neighbourhoods}
          variant="hero"
        />

        <div className="rounded-card border border-line bg-surface p-6">
          <DurationSelector />
        </div>
      </section>

      <IntentDoors />

      {/* The browsable feed. Locals who just want to scroll see it immediately. */}
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
