import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import { pick } from "./copy";
import { copy } from "./board.copy";
import { Board, type BoardRow, type Lane } from "./board/client";

import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, today } from "@/lib/domain/dates";
import { HeroSearch } from "@/components/search/hero-search";

/*
  Experimental candidate "board": the home page is an arrivals board. No
  hero photograph and no sections; everything the site has inspected, every
  lane, is one list of lines in amber on a black board, the way a traveller
  reads a terminal. The board is the one rich object on the page and stays
  dark in both themes, because a board is a physical thing that does not
  change with the reader's settings. The page around it follows the theme.

  The lane tabs re-letter the lines like split flaps; a pointer over a line
  shows its photograph beside the cursor, so the photographs are there
  without taking the first screen.
*/
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const tNav = await getTranslations("nav");
  const tCars = await getTranslations("cars");
  const c = pick(copy, locale);
  const intl = INTL_LOCALES[locale as Locale] ?? "en-GB";
  const year = today().slice(0, 4);
  const date = (iso: string) =>
    formatDate(iso, intl, iso.slice(0, 4) === year ? { day: "2-digit", month: "short" } : { day: "2-digit", month: "short", year: "2-digit" });

  const longIds = new Set(data.leases.map((l) => l.id));
  const status = (left: number) => (left <= 0 ? "full" : left === 1 ? "last" : "open") as BoardRow["status"];

  const rows: BoardRow[] = [
    ...data.stays
      .filter((l) => !longIds.has(l.id))
      .map((l): BoardRow => ({
        key: l.id, lane: "stays", name: l.name, where: l.neighbourhood, inspected: date(l.verification.inspectedAt), at: l.verification.inspectedAt,
        price: l.nightlyRate, unit: c.perNight, status: status(l.unitsAvailable), href: `/stays/${l.slug}`, image: l.images?.[0],
      })),
    ...data.leases.map((l): BoardRow => ({
      key: `${l.id}-rent`, lane: "rent", name: l.name, where: l.neighbourhood, inspected: date(l.verification.inspectedAt), at: l.verification.inspectedAt,
      price: l.monthlyRate ?? l.nightlyRate, unit: l.monthlyRate ? c.perMonth : c.perNight, status: status(l.unitsAvailable), href: `/stays/${l.slug}?band=long`, image: l.images?.[0],
    })),
    ...data.sales.map((s): BoardRow => ({
      key: s.id, lane: "buy", name: s.name, where: s.neighbourhood, inspected: date(s.verification.inspectedAt), at: s.verification.inspectedAt,
      price: s.price, status: "sale", href: `/buy/${s.slug}`, image: s.images?.[0],
    })),
    ...data.cars.map((v): BoardRow => ({
      key: v.id, lane: "cars", name: v.name, where: `${tCars(`class.${v.vehicleClass}`)} · ${c.seats(v.seats)}`, inspected: date(v.verification.inspectedAt), at: v.verification.inspectedAt,
      price: v.dailyRate, unit: c.perDay, status: status(v.unitsAvailable), href: `/cars/${v.slug}`, image: v.images?.[0],
    })),
    ...data.days.map((e): BoardRow => ({
      key: e.id, lane: "days", name: e.name, where: c.hours(e.durationHours), inspected: date(e.verification.inspectedAt), at: e.verification.inspectedAt,
      price: e.pricePerPerson, unit: c.perPerson, status: "open", href: `/experiences/${e.slug}`, image: e.images?.[0],
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const lanes: { key: Lane; label: string }[] = [
    { key: "all", label: c.all },
    { key: "stays", label: tNav("stay") },
    { key: "rent", label: tNav("rent") },
    { key: "buy", label: tNav("buy") },
    { key: "cars", label: tNav("cars") },
    { key: "days", label: c.days },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
        <h1 className="max-w-[18ch] text-balance font-display text-[36px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[52px]">{c.title}</h1>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-2">{c.body}</p>
      </header>

      <Board
        rows={rows}
        lanes={lanes}
        labels={{
          board: c.board, localTime: c.localTime, name: c.colName, where: c.colWhere, inspected: c.colInspected, price: c.colPrice, status: c.colStatus,
          open: c.open, last: c.last, full: c.full, sale: c.forSale, legend: c.legend, less: c.less,
        }}
        more={rows.length > 12 ? Object.fromEntries(lanes.map((l) => [l.key, c.more(l.key === "all" ? rows.length : rows.filter((r) => r.lane === l.key).length)])) : {}}
      />

      <section className="flex flex-col gap-3 sm:max-w-[620px]">
        <h2 className="font-mono text-[13px] text-ink-3">{c.ask}</h2>
        <HeroSearch />
      </section>
    </div>
  );
}
