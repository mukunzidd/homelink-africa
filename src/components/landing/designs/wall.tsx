import type { LandingData } from "../data";
import { pick } from "./copy";
import { copy } from "./wall.copy";
import { Wall, type Tile } from "./wall/client";

import { Link } from "@/i18n/navigation";
import type { Money } from "@/lib/domain/money";
import { MoneyText } from "@/components/ui/money-text";
import { ArrowRightIcon } from "@/components/ui/icons";

/*
  Experimental candidate "wall": the first screen asks one thing, how much a
  night, and answers with every home on the site at once. Every stay's
  photograph sits in one grid, cheapest at the top left; the slider runs
  through the real prices, one home per step, and the homes above the price
  fade back. The wall is the content and the visual at the same time, and
  the count beside the price is the honest answer to "is there anything for
  me here".

  Nothing else is on the page but two quiet lines for cars and days out.
*/
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);

  // All stays are priced in RWF, so ordering by minor units is ordering by
  // price; the listing that is offered by the month shows its nightly rate
  // here like every other.
  const tiles: Tile[] = [...data.stays]
    .sort((a, b) => a.nightlyRate.minor - b.nightlyRate.minor)
    .map((l) => ({ key: l.id, name: l.name, where: l.neighbourhood, price: l.nightlyRate, href: `/stays/${l.slug}`, images: l.images ?? [], seed: l.imageSeed }));

  const cheapest = <T,>(xs: T[], f: (x: T) => Money) => xs.map(f).sort((a, b) => a.minor - b.minor)[0];
  const carFrom = cheapest(data.cars, (v) => v.dailyRate);
  const dayFrom = cheapest(data.days, (e) => e.pricePerPerson);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <Wall
        tiles={tiles}
        title={c.title}
        labels={{ slider: c.slider, orLess: c.orLess, aNight: c.aNight, wall: c.wallLabel, cheapest: c.cheapest, dearest: c.dearest }}
        fit={Object.fromEntries(tiles.map((_, i) => [i + 1, c.fit(i + 1, tiles.length)]))}
        see={Object.fromEntries(tiles.map((_, i) => [i + 1, c.see(i + 1)]))}
      />

      <div className="flex flex-col gap-4 border-t border-line pt-6 text-[14px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{c.more}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {carFrom && (
            <Link href="/cars" className="group inline-flex items-center gap-2 rounded-ctl font-medium text-ink hover:text-brand">
              {c.cars} <span className="font-normal text-ink-3">{c.from}</span> <MoneyText amount={carFrom} rounded />
              <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
          {dayFrom && (
            <Link href="/experiences" className="group inline-flex items-center gap-2 rounded-ctl font-medium text-ink hover:text-brand">
              {c.days} <span className="font-normal text-ink-3">{c.from}</span> <MoneyText amount={dayFrom} rounded />
              <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
