import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import type { Experience, ExperienceInterest } from "@/lib/domain/types";
import { isIsoDate } from "@/lib/domain/dates";
import { multiply } from "@/lib/domain/money";
import { MoneyText } from "@/components/ui/money-text";
import { ClockIcon, RouteIcon } from "@/components/ui/icons";
import { ResultCard, PriceBlock } from "@/components/results/result-card";
import { ListHeader, ListToolbar, ListEnd } from "@/components/results/list-layout";
import { NoMatch } from "@/components/results/no-match";
import { initials } from "@/components/results/inspected-by";
import { InterestFilter } from "@/components/experiences/interest-filter";
import { DaySearchBar } from "@/components/experiences/day-search";
import { DaysMap } from "@/components/experiences/days-map";

const INTERESTS = ["wildlife", "culture", "city", "hiking", "lake", "food"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  return { title: t("title") };
}

/**
 * Days out. The moment here is the map of Rwanda: distance is the first
 * question about any of these, so every pin says how long the drive from
 * Kigali is, and every card says when the day starts and who the guide is,
 * because "guides we know by name" is the promise of the page.
 */
export default async function ExperiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ interest?: string; date?: string; party?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const interest = INTERESTS.includes(sp.interest as ExperienceInterest) ? (sp.interest as ExperienceInterest) : undefined;
  const date = isIsoDate(sp.date) ? sp.date : undefined;
  const partyN = Number(sp.party);
  const party = Number.isInteger(partyN) && partyN >= 1 && partyN <= 10 ? partyN : 2;

  const t = await getTranslations("experiences");
  const tList = await getTranslations("list");
  const tEmpty = await getTranslations("empty");
  const tLanes = await getTranslations("nav");

  const r = repos();
  const [experiences, all] = await Promise.all([r.experiences.list({ interest }), r.experiences.list()]);

  const interestCounts = Object.fromEntries(
    INTERESTS.map((i) => [i, all.filter((e) => e.interests.includes(i)).length]),
  ) as Record<ExperienceInterest, number>;

  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (party !== 2) query.set("party", String(party));
  const qs = query.size ? `?${query}` : "";

  const card = (e: Experience, i: number) => {
    const tooBig = party > e.groupMax;
    return (
      <ResultCard
        key={e.id}
        layout="tile"
        priority={i === 0}
        href={`/experiences/${e.slug}${qs}`}
        title={e.name}
        meta={e.interests.map((x) => t(`interest.${x}`)).join(" · ")}
        extra={
          <div className="flex flex-col gap-1 text-[13px] text-ink-2">
            <p className="flex items-center gap-1.5">
              <ClockIcon size={14} className="text-ink-3" />
              {tList("departsAt", { time: e.departs, hours: e.durationHours })}
            </p>
            <p className="flex items-center gap-1.5">
              <RouteIcon size={14} className="text-ink-3" />
              {e.driveHours < 1 ? tList("inKigaliLong") : tList("driveFromKigali", { hours: e.driveHours })}
            </p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true" className="grid size-[18px] flex-none place-items-center rounded-full bg-surface-2 text-[9px] font-semibold text-ink-2">
                {initials(e.guideName)}
              </span>
              {tList("guidedBy", { name: e.guideName })}
            </p>
          </div>
        }
        image={{ seed: e.imageSeed, src: e.images?.[0], count: e.images?.length ?? 0 }}
        save={{ id: e.id, kind: "experience", name: e.name }}
        inspection={e.verification}
        tags={
          tooBig ? (
            <span className="inline-flex rounded-full bg-warn-tint px-2 py-0.5 text-[12px] font-medium text-warn">
              {tList("groupMaxNote", { count: e.groupMax })}
            </span>
          ) : undefined
        }
        // Per person first, as the landing page and the trip page price it;
        // the party's total is the second line. Leading with the total made
        // the same trip look twice the price between one page and the next.
        price={
          <PriceBlock
            figure={<MoneyText amount={e.pricePerPerson} rounded />}
            unit={t("perPerson")}
            sub={
              party > 1 ? (
                <>
                  <MoneyText amount={multiply(e.pricePerPerson, party)} rounded /> {tList("forPeople", { count: party })}
                </>
              ) : undefined
            }
          />
        }
        cta={tList("ctaBookDay")}
      />
    );
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6 sm:py-8">
      <DaySearchBar key={`${date}-${party}`} initial={{ date, party }} />

      <ListHeader title={tList("daysCount", { count: experiences.length })} subtitle={tList("daysPromise")} />

      <DaysMap
        className="h-64 rounded-card border border-line sm:h-80"
        pins={experiences.map((e) => ({
          id: e.id,
          lat: e.location.lat,
          lng: e.location.lng,
          href: `/experiences/${e.slug}${qs}`,
          name: e.name,
          place: e.meetingPoint.split(" ")[0],
          driveHours: e.driveHours,
        }))}
      />

      {/* Each chip carries its count, and an interest no trip has is not
          offered. Seven bare chips for four trips read like a catalogue far
          bigger than the one behind it. */}
      <ListToolbar
        start={
          <InterestFilter
            interests={INTERESTS.filter((i) => i === interest || interestCounts[i] > 0)}
            counts={interestCounts}
            total={all.length}
          />
        }
      />

      {experiences.length === 0 ? (
        <NoMatch title={tEmpty("noResults")} body={tEmpty("noResultsBody")} lane="experiences">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{all.slice(0, 3).map(card)}</div>
        </NoMatch>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{experiences.map(card)}</div>
          <ListEnd
            count={experiences.length}
            lane="experiences"
            others={[
              { label: tLanes("homesLane"), href: "/stays" },
              { label: tLanes("cars"), href: "/cars" },
            ]}
          />
        </>
      )}
    </div>
  );
}
