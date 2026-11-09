import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import type { Experience, Listing } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, today } from "@/lib/domain/dates";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { EXTRAS } from "@/lib/domain/extras";
import { HeroSearch } from "@/components/search/hero-search";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { initials } from "@/components/results/inspected-by";
import { ArrowRightIcon, CheckIcon, ClockIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { pick } from "./copy";
import { copy } from "./magazine.copy";

/*
  Candidate "magazine": the home page laid out as the Kigali issue of a
  travel magazine. A cover (one photograph, the headline as the cover line,
  the search as the one action), then the issue in order: contents, the
  newest inspection as a two-page spread, homes, days out as a photo essay,
  the neighbourhoods as an index and the three promises as an editor's note.

  The signature is the department marker, a small mono number and the
  section's name, used at the head of each section and nowhere else. The
  photographs carry the colour; the chrome is ink on canvas and hairlines.
*/

const PAGE = "mx-auto w-full max-w-[1240px] px-6";
/** The cover's left column lines up with PAGE while its photograph runs to the window's edge. */
const COVER_LEFT = "px-6 lg:pl-[max(24px,calc((100vw-1240px)/2+24px))] lg:pr-16";

export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tPlaces = await getTranslations("places");
  const tFooter = await getTranslations("footer");
  const tExtras = await getTranslations("extras");
  const tBooking = await getTranslations("booking");
  const tVerify = await getTranslations("verification");
  const tNav = await getTranslations("nav");
  const tExp = await getTranslations("experiences");
  const tSmart = await getTranslations("smart");

  const intl = INTL_LOCALES[locale as Locale] ?? "en-US";
  const month = capitalise(formatDate(today(), intl, { month: "long", year: "numeric" }));
  const shortDate = (iso: string) =>
    formatDate(iso, intl, iso.slice(0, 4) === today().slice(0, 4) ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });

  const { latest, record, checks, days, places, from, lanes } = data;
  const homes = data.featured.filter((l) => l.id !== latest?.id).slice(0, 5);
  const walk = days.find((d) => d.slug === "kigali-city-walk");
  const rent = lanes.find((l) => l.key === "homes");
  const buy = lanes.find((l) => l.key === "buy");
  const coverLines = [
    rent && { href: rent.href, label: tNav(rent.label), title: t("lane.homes", { count: rent.count }) },
    buy && { href: buy.href, label: tNav(buy.label), title: t("lane.buy", { count: buy.count }) },
    latest && { href: "#inspection", label: c.newest, title: `${latest.name}, ${latest.neighbourhood}` },
  ].filter((x): x is { href: string; label: string; title: string } => Boolean(x));

  return (
    <div className="flex flex-col pb-16">
      {/* ------------------------------------------------------------ cover
          One grid for both widths. On a phone the cover line sits on the
          photograph's dark sky, the calm part of the frame, and the search
          follows straight after. From lg the words take the page on the left
          and the photograph runs from the header to the fold on the right. */}
      <section className="relative isolate z-10 grid grid-cols-1 border-b border-line lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)] lg:grid-rows-[auto_1fr_auto_auto_auto_1fr_auto]">
        <p className={cn(COVER_LEFT, "col-start-1 row-start-1 flex items-baseline justify-between gap-4 border-b border-line py-3 text-[13px] text-ink-2 lg:col-start-1 lg:row-start-1 lg:mt-6 lg:border-b-0 lg:py-0")}>
          <span className="font-display text-[17px] font-medium text-ink">{c.issue}</span>
          <span className="font-mono text-[12px] text-ink-3">{month}</span>
        </p>

        <h1 className={cn(COVER_LEFT, "relative z-10 col-start-1 row-start-2 max-w-[13ch] self-start pt-8 font-display text-[44px] font-medium leading-[0.98] tracking-[-0.02em] text-balance text-white sm:max-w-[14ch] sm:text-[60px] lg:row-start-3 lg:max-w-none lg:pt-0 lg:text-[clamp(64px,6.2vw,96px)] lg:leading-[0.94] lg:text-ink")}>
          {t("heroTitle")}
        </h1>

        <p className={cn(COVER_LEFT, "col-start-1 row-start-3 mt-6 max-w-[48ch] text-[17px] leading-relaxed text-ink-2 lg:row-start-4 lg:mt-8 lg:box-content")}>
          {t("heroBody")}
        </p>

        <div className={cn(COVER_LEFT, "col-start-1 row-start-4 mt-6 lg:row-start-5")}>
          <div className="max-w-[560px]">
            <HeroSearch />
          </div>
        </div>

        {/* The cover lines. Renting and buying are the two things a
            Kigali reader comes for that the headline does not say, so they
            are on the cover, beside the newest inspection. */}
        <nav aria-label={c.coverLines} className={cn(COVER_LEFT, "col-start-1 row-start-5 mt-10 mb-10 lg:row-start-7 lg:mt-12 lg:mb-8")}>
          <ul className="flex flex-col border-t border-line">
            {coverLines.map((line) => {
              const body = (
                <>
                  <span className="flex min-w-0 flex-col gap-0.5 sm:contents">
                    <span className="text-[13px] text-ink-3">{line.label}</span>
                    <span className="font-display text-[19px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand sm:text-[20px]">{line.title}</span>
                  </span>
                  <ArrowRightIcon size={16} className="text-ink-3 transition-[color,transform] sm:translate-y-0.5 duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
                </>
              );
              const cls = "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 sm:grid-cols-[144px_minmax(0,1fr)_auto] sm:items-baseline";
              return (
                <li key={line.href} className="border-b border-line-soft last:border-b-0">
                  {line.href.startsWith("#") ? <a href={line.href} className={cls}>{body}</a> : <Link href={line.href} className={cls}>{body}</Link>}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative col-start-1 row-start-2 aspect-square max-h-[520px] w-full overflow-hidden sm:aspect-[16/11] lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:aspect-auto lg:max-h-none">
          <Image src={COVER} alt={c.coverAlt} fill priority sizes="(max-width: 1024px) 100vw, 44vw" className="object-cover object-[50%_30%] sm:object-[50%_70%] lg:object-[50%_60%]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-3/5 bg-[linear-gradient(180deg,rgba(6,10,8,0.62)_0%,rgba(6,10,8,0.32)_55%,rgba(6,10,8,0)_100%)] lg:hidden" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(6,10,8,0)_0%,rgba(6,10,8,0.55)_100%)]" />
          {walk && walk.verification.photographedByHomeLink && (
            <Link href={`/experiences/${walk.slug}`} className="absolute inset-x-0 bottom-0 flex flex-wrap items-baseline gap-x-2 px-6 pb-4 text-[12px] leading-5 text-white/85 hover:text-white lg:px-8 lg:pb-6">
              <span className="font-medium text-white">{walk.name}</span>
              <span className="hidden sm:inline">{tVerify("kinds.experience.photographedBody")}</span>
            </Link>
          )}
        </div>

      </section>

      {/* --------------------------------------------------------- 01 contents */}
      <section id="contents" aria-labelledby="mag-contents" className={cn(PAGE, "scroll-mt-20 pt-20 lg:pt-28")}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <Marker n={1} name={c.contents} />
            <h2 id="mag-contents" className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.01em] text-ink sm:text-[44px]">{t("lanesTitle")}</h2>
          </div>
          <ol className="flex flex-col border-t border-line lg:col-span-8">
            {lanes.map((lane) => (
              <li key={lane.key} className="border-b border-line">
                <Link href={lane.href} className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)_112px] sm:gap-6">
                  <span className="tnum font-display text-[36px] leading-none text-ink-3 transition-colors duration-150 group-hover:text-brand sm:text-[48px]">{lane.count}</span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-[22px] font-medium leading-tight text-ink sm:text-[26px]">{tNav(lane.label)}</span>
                    <span className="text-[14px] leading-snug text-ink-2">{t(`lane.${lane.key}`, { count: lane.count })}</span>
                  </span>
                  <span className="relative hidden h-[72px] w-[112px] overflow-hidden rounded-chip sm:block">
                    <Image src={lane.image} alt="" fill sizes="112px" className="object-cover" />
                  </span>
                  <ArrowRightIcon className="text-ink-3 sm:hidden" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ 02 the spread */}
      {latest && record && (
        <section id="inspection" aria-labelledby="mag-inspection" className={cn(PAGE, "scroll-mt-20 pt-24 lg:pt-32")}>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-0">
            <figure className="flex flex-col gap-3 lg:col-span-7 lg:pr-10">
              <SupplyImage seed={latest.imageSeed} src={latest.images?.[0]} alt={`${latest.name}, ${latest.neighbourhood}`} sizes="(max-width: 1024px) 100vw, 60vw" className="aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5]" />
              <figcaption className="text-[13px] text-ink-3">
                {latest.neighbourhood}, {DISTRICTS[latest.neighbourhood] ?? "Kigali"}. {record.photographedByHomeLink ? tVerify("steps.photographed") : ""}
              </figcaption>
            </figure>

            <div className="flex flex-col gap-6 lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
              <Marker n={2} name={c.inspection} />
              <div className="flex flex-col gap-3">
                <h2 id="mag-inspection" className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.01em] text-ink sm:text-[48px]">{latest.name}</h2>
                <p className="text-[14px] text-ink-3">{latest.neighbourhood} · {c.rooms(latest.bedrooms, latest.sleeps)}</p>
              </div>
              <p className="font-display text-[19px] leading-relaxed text-ink-2">{latest.summary}</p>

              <div className="flex items-center gap-3 border-t border-line pt-5">
                <span aria-hidden className="grid size-11 flex-none -rotate-6 place-items-center rounded-full border-[1.5px] border-trust text-[13px] font-semibold text-trust">
                  {initials(record.inspectorName)}
                </span>
                <p className="text-[14px] leading-snug text-ink-2">{tVerify("inspectedBy", { name: record.inspectorName, date: data.inspectedOn })}</p>
              </div>
              <ul className="flex flex-col">
                {checks.map((ch) => (
                  <li key={ch.key} className="flex items-center gap-2 border-b border-line-soft py-2 text-[15px] text-ink-2 last:border-b-0">
                    <CheckIcon size={16} className="flex-none text-trust" />
                    {tVerify(`steps.${ch.key}`)}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
                <p className="flex items-baseline gap-1">
                  <MoneyText amount={latest.nightlyRate} rounded className="font-display text-[26px] font-medium text-ink" />
                  <span className="text-[14px] text-ink-3">{tSmart("perNightShort")}</span>
                </p>
                <Link href={`/stays/${latest.slug}`} className="group inline-flex items-center gap-2 rounded-ctl text-[15px] font-medium text-brand hover:text-brand-deep">
                  {tVerify("openRecord")}
                  <ArrowRightIcon size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </div>

              {(latest.images?.length ?? 0) > 2 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {latest.images!.slice(1, 3).map((src) => (
                    <SupplyImage key={src} seed={latest.imageSeed} src={src} alt={`${latest.name}, ${latest.neighbourhood}`} sizes="(max-width: 1024px) 50vw, 20vw" className="aspect-[4/3]" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- 03 homes
          An asymmetric grid: one large, one tall dropped beside it, then
          three at a smaller size, each with its caption under it. */}
      {homes.length > 0 && (
        <section aria-labelledby="mag-homes" className={cn(PAGE, "pt-24 lg:pt-32")}>
          <Head n={3} name={tSmart("groupStays")} id="mag-homes" title={t("feedTitle")} body={t("feedBody")} href="/stays" link={t("viewAll")} />
          <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
            {homes.map((l, i) => (
              <HomePlate
                key={l.id}
                listing={l}
                inspected={tVerify("inspectedBy", { name: l.verification.inspectorName, date: shortDate(l.verification.inspectedAt) })}
                perNight={tSmart("perNightShort")}
                className={
                  ["sm:col-span-2 lg:col-span-7", "lg:col-span-5 lg:mt-24", "lg:col-span-4", "lg:col-span-4 lg:mt-16", "lg:col-span-4"][i]
                }
                imageClass={["aspect-[4/3]", "aspect-[4/3] sm:aspect-[4/5]", "aspect-[4/3] sm:aspect-[4/5]", "aspect-[4/3]", "aspect-[4/3] sm:aspect-[4/5]"][i]}
                large={i === 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- 04 days out
          A photo essay: wide and tall frames alternating, captions set
          under each like a magazine's, with the time and the price. */}
      {days.length > 0 && (
        <section aria-labelledby="mag-days" className={cn(PAGE, "pt-24 lg:pt-32")}>
          <Head n={4} name={tSmart("groupExperiences")} id="mag-days" title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
          <div className="mt-10 grid gap-x-8 gap-y-12 lg:grid-cols-12">
            {days.slice(0, 4).map((e, i) => (
              <DayFrame
                key={e.id}
                day={e}
                src={essayImage(e, i === 1 || i === 2)}
                duration={tExp("duration", { count: e.durationHours })}
                group={tExp("groupMax", { count: e.groupMax })}
                perPerson={tExp("perPerson")}
                className={["lg:col-span-8", "lg:col-span-4", "lg:col-span-4", "lg:col-span-8"][i]}
                imageClass={["aspect-[3/2]", "aspect-[3/2] sm:aspect-[4/5] lg:aspect-auto lg:flex-1", "aspect-[3/2] sm:aspect-[4/5] lg:aspect-auto lg:flex-1", "aspect-[3/2]"][i]}
              />
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------- 05 neighbourhoods
          The back-of-the-issue index: the name, its district, a dotted
          leader, then how many verified places and the cheapest night. */}
      <section aria-labelledby="mag-places" className={cn(PAGE, "pt-24 lg:pt-32")}>
        <Head n={5} name={tSmart("groupPlaces")} id="mag-places" title={t("placesTitle")} body={t("placesBody")} />
        <ul className="mt-10 grid border-t border-line lg:grid-cols-2 lg:gap-x-16">
          {places.map((p) => {
            const price = from.get(p.name);
            return (
              <li key={p.name} className="border-b border-line">
                <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex flex-col gap-2 py-4">
                  <span className="flex min-h-12 items-baseline gap-3">
                    <span className="flex min-w-0 flex-none flex-col">
                      <span className="font-display text-[20px] font-medium leading-tight text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</span>
                      <span className="text-[13px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                    </span>
                    <span aria-hidden className="min-w-4 flex-1 translate-y-[-6px] self-start border-b border-dotted border-ink-3/60 pt-5" />
                    <span className="flex flex-none flex-col items-end text-[13px]">
                      <span className="tnum text-ink-2">{tSmart("placeCount", { count: p.count })}</span>
                      {price && (
                        <span className="text-ink-3">
                          {t("fromPrice")} <MoneyText amount={price} rounded className="font-medium text-ink" />
                        </span>
                      )}
                    </span>
                  </span>
                  {tPlaces.has(p.name) && <span className="max-w-[48ch] text-[14px] leading-snug text-ink-2">{tPlaces(p.name)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* -------------------------------------------------- 06 editor's note
          The three promises as a short letter, run-in titles, signed by the
          team that keeps them. */}
      <section aria-labelledby="mag-note" className={cn(PAGE, "pt-24 lg:pt-32")}>
        <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Marker n={6} name={c.note} />
          </div>
          <div className="flex max-w-[640px] flex-col gap-6 lg:col-span-7">
            <h2 id="mag-note" className="font-display text-[30px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[36px]">{t("howBody").replace(/\.$/, "")}</h2>
            {(["inspect", "escrow", "people"] as const).map((step) => (
              <p key={step} className="text-[17px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">{t(`how.${step}Title`)}. </span>
                {t(`how.${step}Body`)}
              </p>
            ))}
            <p className="flex flex-col gap-1 border-t border-line pt-4">
              <span className="font-display text-[17px] font-medium text-ink">{c.signed}</span>
              <span className="font-mono text-[12px] text-ink-3">{month}</span>
            </p>

            {/* The back page's practical box: how to get in from the
                airport and how to reach a person, the two questions the
                letter raises and does not answer. */}
            <div className="mt-4 grid gap-6 rounded-card border border-line bg-surface p-6 sm:grid-cols-2 sm:gap-8">
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-medium text-ink">{tExtras("airportPickup.name")}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2">{tExtras("airportPickup.body")}</p>
                <p className="text-[14px] text-ink-3">
                  <MoneyText amount={EXTRAS.airportPickup.price} rounded className="font-medium text-ink" /> {tBooking("extras.perBooking")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-medium text-ink">{c.talkTitle}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2">{c.talkBody}</p>
                <p className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium">
                  <Link href="/contact" className="group inline-flex items-center gap-2 rounded-ctl text-brand hover:text-brand-deep">
                    {tFooter("contact")}
                    <ArrowRightIcon size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/help" className="rounded-ctl text-brand hover:text-brand-deep">{tFooter("help")}</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** The department marker: the signature, at the head of each section and nowhere else. */
function Marker({ n, name }: { n: number; name: string }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[12px] text-ink-3">
      <span className="tnum font-medium text-brand">{String(n).padStart(2, "0")}</span>
      <span aria-hidden className="h-px w-8 bg-line" />
      <span>{name}</span>
    </p>
  );
}

function Head({ n, name, id, title, body, href, link }: { n: number; name: string; id: string; title: string; body?: string; href?: string; link?: string }) {
  return (
    <div className="grid gap-4 border-t border-line pt-8 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-3">
        <Marker n={n} name={name} />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-6">
        <h2 id={id} className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.01em] text-ink sm:text-[44px]">{title}</h2>
        {body && <p className="max-w-[52ch] text-[17px] leading-relaxed text-ink-2">{body}</p>}
      </div>
      {href && link && (
        <div className="lg:col-span-3 lg:self-end lg:justify-self-end">
          <Link href={href} className="group inline-flex items-center gap-2 rounded-ctl text-[15px] font-medium text-brand hover:text-brand-deep">
            {link}
            <ArrowRightIcon size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function HomePlate({ listing: l, inspected, perNight, className, imageClass, large }: { listing: Listing; inspected: string; perNight: string; className?: string; imageClass: string; large?: boolean }) {
  return (
    <Link href={`/stays/${l.slug}`} className={cn("group flex flex-col gap-3", className)}>
      <SupplyImage seed={l.imageSeed} src={l.images?.[0]} alt={`${l.name}, ${l.neighbourhood}`} sizes={large ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw"} className={imageClass} />
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline justify-between gap-4">
          <span className={cn("font-display font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand", large ? "text-[24px] sm:text-[28px]" : "text-[20px]")}>{l.name}</span>
          <span className="flex flex-none items-baseline gap-0.5 text-[14px]">
            <MoneyText amount={l.nightlyRate} rounded className="font-medium text-ink" />
            <span className="text-ink-3">{perNight}</span>
          </span>
        </span>
        <span className="text-[13px] leading-snug text-ink-3">{l.neighbourhood}. {inspected}</span>
      </span>
    </Link>
  );
}

function DayFrame({ day: e, src, duration, group, perPerson, className, imageClass }: { day: Experience; src?: string; duration: string; group: string; perPerson: string; className?: string; imageClass: string }) {
  return (
    <Link href={`/experiences/${e.slug}`} className={cn("group flex flex-col gap-3", className)}>
      <SupplyImage seed={e.imageSeed} src={src} alt={e.name} sizes="(max-width: 1024px) 100vw, 66vw" className={cn("w-full", imageClass)} />
      <span className="flex flex-col gap-1">
        <span className="font-display text-[22px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{e.name}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
          <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{duration}</span>
          <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{group}</span>
          <span className="flex items-baseline gap-1">
            <MoneyText amount={e.pricePerPerson} rounded className="font-medium text-ink" />
            <span className="text-ink-3">{perPerson}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

/*
  The essay alternates wide and tall frames, so each day gets the
  photograph of its own set that suits its frame. On a phone every frame is
  wide: a column of tall frames is a screen per photograph. The night street is the
  cover, so it is left out here.
*/
const PORTRAIT = new Set([
  "/images/experiences/gorillas-4.jpg",
  "/images/experiences/kivu-2.jpg",
  "/images/experiences/kivu-4.jpg",
  "/images/experiences/nyungwe-2.jpg",
]);
const COVER = "/images/experiences/kigali-3.jpg";

function essayImage(e: Experience, tall: boolean): string | undefined {
  const own = (e.images ?? []).filter((src) => src !== COVER);
  return own.find((src) => PORTRAIT.has(src) === tall) ?? own[0];
}

function capitalise(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}
