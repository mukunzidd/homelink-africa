import { getTranslations } from "next-intl/server";
import { repos } from "@/lib/repos";
import { reviewSummary } from "@/lib/workspace/review-summary";
import { formatDate } from "@/lib/domain/dates";
import { ReviewList } from "./review-list";

const ASPECTS = ["cleanliness", "accuracy", "checkIn", "communication", "location", "value"] as const;

/**
 * What guests said, under the inspection record. The average and the six
 * scores first, then the words, six at a time. Under three reviews the
 * section says the place is new rather than letting one guest's stars
 * stand for it.
 */
export async function Reviews({ supplyId, intl }: { supplyId: string; intl: string }) {
  const t = await getTranslations("reviews");
  const reviews = await repos().reviews.forSupply(supplyId);
  const s = reviewSummary(reviews);
  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-5 border-t border-line py-6">
      <h2 id="reviews-title" className="font-display text-2xl font-semibold text-ink">
        {s ? t("title", { score: s.overall.toFixed(1), count: s.count }) : t("titleNew")}
      </h2>
      {!s ? (
        <p className="max-w-[62ch] text-[15px] text-ink-2">{t("new", { count: reviews.length })}</p>
      ) : (
        <>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {ASPECTS.map((a) => (
              <div key={a} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-3 text-[14px]">
                <dt className="text-ink-2">{t(`aspects.${a}`)}</dt>
                <dd className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-ink-2" style={{ width: `${(s.aspects[a] / 5) * 100}%` }} />
                </dd>
                <dd className="tnum text-right font-semibold text-ink">{s.aspects[a].toFixed(1)}</dd>
              </div>
            ))}
          </dl>
          <ReviewList
            more={t("more")}
            reviews={reviews.map((r) => ({ id: r.id, name: r.guestFirstName, when: formatDate(r.createdAt.slice(0, 10), intl, { month: "long", year: "numeric" }), text: r.text }))}
          />
        </>
      )}
    </section>
  );
}
