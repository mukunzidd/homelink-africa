import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, today } from "@/lib/domain/dates";
import { initials } from "@/components/results/inspected-by";
import { HeroSearch } from "@/components/search/hero-search";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { cn } from "@/lib/cn";
import { Composer } from "./composer";
import { pick } from "../copy";
import { copy } from "../concierge.copy";

/**
 * The hero's moment: a thread with the Kigali team, drawn in the look of the
 * app's own message page (transcript, day rule, a tinted bubble for you, a
 * bordered one for the team) but built here from the landing data, so it
 * needs no session. The guest's words are illustrative; the reply's cards are
 * the three most recently inspected stays, and the reply is signed by the
 * person who inspected the first of them, so what it says is true of what it
 * shows. The search sits where the reply box would be.
 *
 * The times are part of the picture, not a claim about response times, and
 * the read receipt sits only under the guest's last message, as in the app.
 *
 * The reply box is sticky to the bottom of the screen while the thread is in
 * view (see Composer), which is what puts the search in a phone's first
 * screen: the conversation scrolls under it, as it would in a chat app.
 */
export async function Thread({ locale, cards, inspectedOn, className }: { locale: string; cards: Listing[]; inspectedOn: string; className?: string }) {
  const c = pick(copy, locale);
  const tMsg = await getTranslations("messaging");
  const tSmart = await getTranslations("smart");
  const tVerify = await getTranslations("verification");
  const first = cards[0];
  if (!first) return null;
  const author = first.verification.inspectorName;

  return (
    <div className={cn("flex flex-col rounded-[16px] border border-line bg-surface shadow-[var(--shadow-card)]", className)}>
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Stamp name={author} className="size-10 text-[13px]" />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[15px] font-medium text-ink">{c.threadTitle}</p>
          <p className="truncate text-[13px] text-ink-3">{c.threadWith(author)}</p>
        </div>
      </header>

      <ol className="flex flex-col gap-4 bg-canvas px-4 py-5 sm:px-6 sm:py-6">
        <li>
          <p className="flex items-center gap-3 text-[12px] font-medium text-ink-3">
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            {c.today}
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </p>
        </li>

        <li className="flex flex-col items-end gap-1">
          <div className="flex max-w-[40ch] flex-col gap-1 rounded-card bg-brand-tint px-4 py-3">
            <Meta name={tMsg("you")} time="09:12" />
            <p className="text-[15px] leading-relaxed text-ink-2">{c.ask}</p>
          </div>
          <Receipt label={tMsg("readAt", { time: "09:13" })} />
        </li>

        <li className="flex flex-col items-start">
          <div className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-3 sm:max-w-[600px] sm:p-4">
            <div className="flex flex-col gap-1 px-1">
              <Meta name={author} role={c.inspectorRole} time="09:14" />
              <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{c.reply(inspectedOn)}</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-3">
              {cards.map((l) => (
                <li key={l.id}>
                  <Card listing={l} locale={locale} perNight={tSmart("perNightShort")} label={tVerify("inspectedBy", { name: l.verification.inspectorName, date: shortDate(l.verification.inspectedAt, locale) })} />
                </li>
              ))}
            </ul>
          </div>
        </li>
      </ol>

      <Composer className="sticky bottom-0 z-20 flex flex-col gap-2 rounded-b-[16px] border-t border-line bg-surface px-4 pb-4 pt-3 sm:px-5 sm:pt-4">
        <p className="px-1 text-[13px] text-ink-3">{c.composer}</p>
        <HeroSearch />
      </Composer>
    </div>
  );
}

function Meta({ name, role, time }: { name: string; role?: string; time: string }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-[13px] font-semibold text-ink">{name}</span>
      {role && <span className="text-[12px] text-ink-3">{role}</span>}
      <span className="tnum text-[12px] text-ink-3">{time}</span>
    </p>
  );
}

/** Two ticks and the time it was read: the one place on the page that says someone is on the other end. */
function Receipt({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1 pr-1 text-[12px] text-ink-3">
      <svg aria-hidden="true" width="18" height="12" viewBox="0 0 18 12" fill="none" className="text-brand">
        <path d="M1 6.5 4.5 10 11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 9.5 7.5 10 14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="tnum">{label}</span>
    </p>
  );
}

/** The inspector's initials as a stamp, the same ring the listing pages use. */
export function Stamp({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid flex-none -rotate-6 place-items-center rounded-full border-[1.5px] border-trust font-semibold tracking-wide text-trust", className)}>
      {initials(name)}
    </span>
  );
}

export function shortDate(iso: string, locale: string) {
  const thisYear = iso.slice(0, 4) === today().slice(0, 4);
  return formatDate(iso, INTL_LOCALES[locale as Locale], thisYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

function Card({ listing, locale, perNight, label }: { listing: Listing; locale: string; perNight: string; label: string }) {
  const { verification: v } = listing;
  return (
    <Link
      href={`/stays/${listing.slug}`}
      className="group flex h-full gap-3 rounded-[10px] border border-line-soft bg-canvas p-2 transition-colors duration-150 hover:border-brand/40 sm:flex-col sm:gap-2"
    >
      <SupplyImage seed={listing.imageSeed} src={listing.images?.[0]} alt={listing.name} sizes="(max-width: 640px) 80px, 200px" className="size-20 flex-none rounded-[6px] sm:h-24 sm:w-full" />
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:px-1 sm:pb-1">
        <span className="line-clamp-2 text-[14px] font-medium leading-snug text-ink group-hover:text-brand">{listing.name}</span>
        <span className="text-[12px] text-ink-3">{listing.neighbourhood}</span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <span className="flex items-baseline gap-0.5 text-[13px]">
            <MoneyText amount={listing.nightlyRate} rounded className="font-medium text-ink" />
            <span className="text-ink-3">{perNight}</span>
          </span>
          <span className="flex items-center gap-1 text-[12px] text-ink-3" title={label}>
            <Stamp name={v.inspectorName} className="size-6 text-[11px]" />
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className="tnum">{shortDate(v.inspectedAt, locale)}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}
