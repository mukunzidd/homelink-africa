import { getTranslations } from "next-intl/server";
import type { Money } from "@/lib/domain/money";
import { Link } from "@/i18n/navigation";
import { areaCentre } from "@/lib/places/area";
import { PLACES } from "@/lib/places/gazetteer";
import { MoneyText } from "@/components/ui/money-text";
import { cn } from "@/lib/cn";
import { contours, KM, MAP_H, MAP_W, project } from "./contours";

type Side = "l" | "r" | "t" | "b";

/*
  Which side of its dot each name sits on, set by hand so the labels in the
  crowded middle of the city (Kacyiru, Kimihurura, Nyarutarama, Kibagabaga)
  do not land on each other. A neighbourhood not listed here sits right.
*/
const SIDE: Record<string, Side> = {
  Kiyovu: "l",
  Kimihurura: "b",
  Kacyiru: "l",
  Nyarutarama: "b",
  Kibagabaga: "r",
  Remera: "r",
  Gacuriro: "r",
  Kicukiro: "r",
  Gikondo: "l",
  Nyamirambo: "t",
  Rebero: "r",
  Kagugu: "l",
  Gisozi: "l",
  Kimironko: "b",
  Sonatubes: "t",
  Kanombe: "b",
};

/* On a phone the map is a third of the size and a few sides change. */
const PHONE_SIDE: Record<string, Side> = {
  Kimihurura: "r",
  Nyarutarama: "l",
  Gikondo: "b",
};

const OFFSET: Record<Side, string> = {
  r: "translate-x-[10px] -translate-y-1/2 text-left",
  l: "-translate-x-[calc(100%+10px)] -translate-y-1/2 text-right",
  t: "-translate-x-1/2 -translate-y-[calc(100%+8px)] text-center items-center",
  b: "-translate-x-1/2 translate-y-[8px] text-center items-center",
};

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;

/**
 * Kigali drawn as hills, with every neighbourhood we have homes in placed at
 * the middle of its area (areaCentre, never a home's own point) and labelled
 * with its verified count and its cheapest night.
 */
export async function HillMap({
  places,
  from,
  label,
  north,
  km,
  note,
}: {
  places: { name: string; count: number }[];
  from: Map<string, Money>;
  label: string;
  north: string;
  km: string;
  note: string;
}) {
  const t = await getTranslations("landing");
  const tSmart = await getTranslations("smart");
  const lines = contours();
  const known = new Set(places.map((p) => p.name));
  // The rest of the gazetteer's neighbourhoods, named quietly so the city is
  // whole. Nyarugenge is the old centre and sits on Kiyovu's dot.
  const quiet = PLACES.filter((p) => p.kind === "neighbourhood" && !known.has(p.name) && p.name !== "Nyarugenge");
  const mount = project(-1.9796, 30.0306);

  return (
    <figure className="flex flex-col gap-3">
      <div role="img" aria-label={label} className="relative w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="absolute inset-0 size-full text-ink-3"
          aria-hidden
          style={{
            maskImage: "radial-gradient(ellipse 58% 56% at 50% 50%, #000 70%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 58% 56% at 50% 50%, #000 70%, transparent 100%)",
          }}
        >
          {lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              stroke={l.index ? "currentColor" : "var(--line)"}
              strokeOpacity={l.index ? 0.45 : 1}
              strokeWidth={l.index ? 1.25 : 1}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Mount Kigali, the one summit named: the hill most people see from the city */}
        <span
          aria-hidden
          className="absolute hidden -translate-x-1/2 translate-y-[6px] whitespace-nowrap text-[11px] text-ink-3 sm:block"
          style={{ left: pct(mount.x, MAP_W), top: pct(mount.y, MAP_H) }}
        >
          Mount Kigali
        </span>
        <span
          aria-hidden
          className="absolute hidden size-0 -translate-x-1/2 -translate-y-full border-x-[5px] border-b-[8px] border-x-transparent border-b-ink-3 sm:block"
          style={{ left: pct(mount.x, MAP_W), top: pct(mount.y, MAP_H) }}
        />

        {quiet.map((p) => {
          const at = project(p.lat, p.lng);
          const side = SIDE[p.name] ?? "r";
          return (
            <span key={p.name} aria-hidden>
              <span
                className="absolute hidden size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-3 bg-canvas sm:block"
                style={{ left: pct(at.x, MAP_W), top: pct(at.y, MAP_H) }}
              />
              <span
                className={cn("absolute hidden whitespace-nowrap text-[12px] text-ink-3 lg:flex", OFFSET[side])}
                style={{ left: pct(at.x, MAP_W), top: pct(at.y, MAP_H) }}
              >
                {p.name}
              </span>
            </span>
          );
        })}

        {places.map((p) => {
          const c = areaCentre(p.name);
          const at = project(c.lat, c.lng);
          const price = from.get(p.name);
          const side = SIDE[p.name] ?? "r";
          const phone = PHONE_SIDE[p.name] ?? side;
          const style = { left: pct(at.x, MAP_W), top: pct(at.y, MAP_H) };
          return (
            <span key={p.name}>
              <span
                aria-hidden
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-canvas"
                style={style}
              />
              {[
                { show: "flex sm:hidden", s: phone, detail: false },
                { show: "hidden sm:flex", s: side, detail: true },
              ].map((v) => (
                <Link
                  key={v.show}
                  href={`/neighbourhoods/${p.name.toLowerCase()}`}
                  className={cn("group absolute flex-col whitespace-nowrap rounded-ctl", v.show, OFFSET[v.s])}
                  style={style}
                >
                  <span className="text-[12px] font-medium leading-4 text-ink transition-colors duration-150 group-hover:text-brand sm:text-[14px] sm:leading-5">
                    {p.name}
                    <span className="tnum ml-1 font-normal text-ink-3 xl:hidden">{p.count}</span>
                  </span>
                  {v.detail && (
                    <span className="tnum hidden text-[12px] leading-4 text-ink-3 xl:block">
                      {tSmart("placeCount", { count: p.count })}
                      {price && (
                        <>
                          {" · "}
                          {t("fromPrice").toLowerCase()} <MoneyText amount={price} rounded className="text-ink-2" />
                        </>
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </span>
          );
        })}

        {/* North and a kilometre, as on any map someone would trust */}
        <div
          aria-hidden
          className="absolute bottom-[5%] right-[6%] flex flex-col gap-1 text-[11px] leading-none text-ink-3"
          style={{ width: pct(KM, MAP_W) }}
        >
          <span className="whitespace-nowrap">{km}</span>
          <span className="block h-1 w-full border-x border-b border-current" />
        </div>
        <div aria-hidden className="absolute right-[6%] top-[5%] flex flex-col items-center gap-1 text-[11px] leading-none text-ink-3">
          <span>{north}</span>
          <span className="h-4 w-px bg-current" />
        </div>
      </div>
      <figcaption className="text-[13px] text-ink-3 lg:text-center">{note}</figcaption>
    </figure>
  );
}
