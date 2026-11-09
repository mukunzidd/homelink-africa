import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import { Link } from "@/i18n/navigation";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { AskButton } from "@/components/search/hero-search";
import { IntentChips } from "@/components/search/intent-chips";
import { ArrowRightIcon, CheckIcon, ClockIcon, ShieldIcon, UsersIcon } from "@/components/ui/icons";
import { pick } from "./copy";
import { copy } from "./concierge.copy";
import { Stamp, Thread, shortDate } from "./concierge/thread";

/**
 * Candidate home page "concierge": the page as a conversation with the team.
 *
 * What separates HomeLink from a listings site is the people in Kigali who
 * inspected the homes and answer you, so the first screen is a thread with
 * them, and the search is the reply box. Beside it, the five lanes, so a
 * resident after a monthly rental or a title-checked sale is one tap from the
 * top. Below it, the same people by name (worked out from the inspection
 * records, not written in) and what they check, then the sentences the search
 * reads, the neighbourhoods and the days out. The "how it works" promises the
 * other designs carry are left out here: the checks panel already says each
 * of them, with the escrow terms, under the names of the people who keep them.
 * Timestamps and the read receipt belong to the thread and appear nowhere else.
 */
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tVerify = await getTranslations("verification");
  const tNav = await getTranslations("nav");
  const tSmart = await getTranslations("smart");
  const tExp = await getTranslations("experiences");

  // The newest three inspections, in the order data.latest is chosen, so the
  // reply's "the first one" and its date are the same record.
  const cards = [...data.stays].sort((a, b) => b.verification.inspectedAt.localeCompare(a.verification.inspectedAt)).slice(0, 3);

  // The inspectors named on the stays, with what each one signed for.
  const people = [
    ...data.stays
      .reduce((m, l) => {
        const v = l.verification;
        const p = m.get(v.inspectorName) ?? { name: v.inspectorName, count: 0, areas: new Set<string>(), latest: v.inspectedAt };
        p.count += 1;
        p.areas.add(l.neighbourhood);
        if (v.inspectedAt > p.latest) p.latest = v.inspectedAt;
        return m.set(v.inspectorName, p);
      }, new Map<string, { name: string; count: number; areas: Set<string>; latest: string }>())
      .values(),
  ].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));

  return (
    <div className="flex flex-col">
      {/* First screen. z-10 so the search's answer paints over what follows.
          Three blocks: the words, the thread, and the five lanes. On a wide
          screen the thread takes the right column and the lanes sit under the
          words; on a phone the lanes follow the thread, whose reply box stays
          pinned to the bottom of the screen while it is in view. */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-16 lg:gap-y-10 lg:py-12">
          <div className="flex flex-col items-start gap-5 lg:gap-6 lg:self-end">
            <h1 className="max-w-[15ch] text-balance font-display text-[36px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[56px]">{c.title}</h1>
            <p className="max-w-[40ch] text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">{c.body(data.total)}</p>
            <p className="flex max-w-[44ch] items-start gap-2 text-[14px] leading-snug text-ink-2">
              <ShieldIcon size={16} className="mt-0.5 flex-none text-trust" />
              {c.escrow}
            </p>
          </div>

          <Thread locale={locale} cards={cards} inspectedOn={data.inspectedOn} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" />

          {/* The five lanes, so renting and buying are one tap from the top. */}
          <nav aria-labelledby="lanes-heading" className="flex flex-col gap-2 lg:self-start">
            <h2 id="lanes-heading" className="text-[13px] text-ink-3">{t("lanesTitle")}</h2>
            <ul className="flex flex-col border-t border-line">
              {data.lanes.map((lane) => (
                <li key={lane.key} className="border-b border-line">
                  <Link href={lane.href} className="group flex items-center gap-3 rounded-ctl py-2">
                    <span className="relative size-10 flex-none overflow-hidden rounded-[8px]">
                      <Image src={lane.image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium leading-5 text-ink transition-colors duration-150 group-hover:text-brand">{tNav(lane.label)}</span>
                      <span className="tnum text-[13px] leading-5 text-ink-3">{t(`lane.${lane.key}`, { count: lane.count })}</span>
                    </span>
                    <ArrowRightIcon size={16} className="flex-none text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-24 px-4 pt-12 sm:px-6 lg:pt-16">
        {/* The people, from the records. */}
        <section aria-labelledby="people-heading" className="flex flex-col gap-8">
          <Head id="people-heading" title={c.peopleTitle} body={c.peopleBody} href="/contact" link={c.writeTeam} />
          <ul className="grid border-t border-line sm:grid-cols-3 sm:gap-x-8">
            {people.map((p) => (
              <li key={p.name} className="flex items-start gap-4 border-b border-line py-6">
                <Stamp name={p.name} className="size-14 text-[17px]" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-display text-[22px] font-medium leading-tight text-ink">{p.name}</p>
                  <p className="tnum text-[15px] text-ink-2">{c.inspected(p.count)}</p>
                  <p className="text-[13px] leading-relaxed text-ink-3">{[...p.areas].sort().join(", ")}</p>
                  <p className="tnum text-[13px] text-ink-3">{c.latest(shortDate(p.latest, locale))}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 rounded-card border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
            <h3 className="font-display text-[22px] font-medium leading-snug text-ink">{c.checksTitle}</h3>
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {data.checks.map((k) => (
                <li key={k.key} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
                  <CheckIcon size={18} className="mt-0.5 text-trust" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[15px] font-medium text-ink">{tVerify(`steps.${k.key}`)}</p>
                    <p className="text-[14px] leading-relaxed text-ink-2">{tVerify(`steps.${k.key}Body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Things people ask, each with what the search reads in it. */}
        <section aria-labelledby="ask-heading" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="lg:self-start"><Head id="ask-heading" title={t("smartTitle")} body={t("smartBody")} /></div>
          <ul className="flex flex-col gap-4">
            {data.showcase.map((ex) => (
              <li key={ex.key} className="flex flex-col items-end gap-2">
                <AskButton
                  query={ex.sentence}
                  className="group flex max-w-full cursor-pointer items-center gap-3 rounded-card bg-brand-tint px-4 py-3 text-left transition-colors duration-150 hover:bg-brand/15"
                >
                  <span className="text-[15px] text-ink">{ex.sentence}</span>
                  <ArrowRightIcon size={16} className="flex-none text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
                </AskButton>
                <div className="flex max-w-full flex-wrap justify-end">
                  <IntentChips intent={ex.intent} locale={locale} datesAsWords />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Neighbourhoods, with how many verified places and the cheapest night. */}
        <section aria-labelledby="places-heading" className="flex flex-col gap-8">
          <Head id="places-heading" title={t("placesTitle")} body={t("placesBody")} />
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            {data.places.map((p) => {
              const price = data.from.get(p.name);
              return (
                <li key={p.name} className="border-b border-line">
                  <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex h-16 items-center justify-between gap-4 rounded-ctl">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[16px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</span>
                      <span className="text-[13px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                    </span>
                    <span className="flex flex-none flex-col items-end text-[13px]">
                      <span className="tnum text-ink-2">{tSmart("placeCount", { count: p.count })}</span>
                      {price && (
                        <span className="text-ink-3">
                          {t("fromPrice")} <MoneyText amount={price} rounded className="font-medium text-ink" />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Days out. */}
        <section aria-labelledby="days-heading" className="flex flex-col gap-8">
          <Head id="days-heading" title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.days.map((e) => (
              <Link
                key={e.id}
                href={`/experiences/${e.slug}`}
                className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 hover:border-brand/40"
              >
                <SupplyImage seed={e.imageSeed} src={e.images?.[0]} alt={e.name} sizes="(max-width: 640px) 100vw, 25vw" className="h-36" />
                <span className="flex flex-1 flex-col gap-2 p-4">
                  <span className="text-[16px] font-medium leading-snug text-ink group-hover:text-brand">{e.name}</span>
                  <span className="flex flex-wrap gap-x-4 text-[13px] text-ink-2">
                    <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{tExp("duration", { count: e.durationHours })}</span>
                    <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{tExp("groupMax", { count: e.groupMax })}</span>
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="flex items-baseline gap-1">
                      <MoneyText amount={e.pricePerPerson} rounded className="font-semibold text-ink" />
                      <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-ink-3">
                      <Stamp name={e.verification.inspectorName} className="size-6 text-[11px]" />
                      <span className="sr-only">{tVerify("inspectedBy", { name: e.verification.inspectorName, date: shortDate(e.verification.inspectedAt, locale) })}</span>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Head({ id, title, body, href, link }: { id: string; title: string; body?: string; href?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="font-display text-[28px] font-medium leading-tight text-ink">{title}</h2>
        {body && <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{body}</p>}
      </div>
      {href && link && (
        <Link href={href} className="inline-flex items-center gap-2 rounded-ctl text-[15px] font-medium text-brand hover:text-brand-deep">
          {link}
          <ArrowRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}
