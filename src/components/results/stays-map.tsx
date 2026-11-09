"use client";

import { useTranslations } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { LANDMARK_KEYS, LANDMARK_POINTS } from "@/lib/domain/landmarks";
import { TileMap, type MapLandmark } from "@/components/map/tile-map";
import { useHoverSync } from "./hover-sync";

/**
 * One home on a results map. Its point is its neighbourhood's centre (the
 * repos never hand the public site anything finer), so homes in the same
 * neighbourhood share it: `area` names it and `areaHref` is the results
 * page narrowed to it, which is where a pin standing for several homes goes.
 */
export type StayPin = { id: string; lat: number; lng: number; price: Money; href: string; name: string; area: string; areaHref: string };

/** The seven places a newcomer reads Kigali by, as map markers. */
/**
 * Landmarks as map labels. They read from `landmarkNames`, not `landmarks`:
 * the latter is written to finish a sentence ("15 min to the city centre"),
 * and a map label that says "the embassies" in lower case looks like a typo.
 */
export function useLandmarks(): MapLandmark[] {
  const t = useTranslations("landmarkNames");
  return LANDMARK_KEYS.map((k) => ({ id: k, ...LANDMARK_POINTS[k], label: t(k) }));
}

export function StaysMap({ pins, className, preview, compact }: { pins: StayPin[]; className?: string; preview?: boolean; compact?: boolean }) {
  const t = useTranslations("map");
  const { displayRounded, displayCompact } = usePreferences();
  const fmt = compact ? displayCompact : displayRounded;
  const { id, set } = useHoverSync();
  const landmarks = useLandmarks();

  // One pin per neighbourhood. Several homes at one point would stack, and
  // only the top price would show. A lone home keeps its own pin, price and
  // link; a group says how many and the lowest price, and opens the list.
  const groups = new Map<string, StayPin[]>();
  for (const p of pins) groups.set(p.area, [...(groups.get(p.area) ?? []), p]);
  const groupOf = new Map(pins.map((p) => [p.id, groups.get(p.area)!.length > 1 ? `area:${p.area}` : p.id]));

  return (
    <TileMap
      label={t("resultsLabel", { count: pins.length })}
      // A row hovered in the list lights its neighbourhood's pin.
      activeId={id ? (groupOf.get(id) ?? id) : id}
      onPinHover={(pin) => set(pin && !pin.startsWith("area:") ? pin : null)}
      className={className}
      preview={preview}
      landmarks={landmarks}
      maxZoom={preview ? 13 : 15}
      pins={[...groups.values()].map((g) => {
        if (g.length === 1) {
          const p = g[0];
          return { id: p.id, lat: p.lat, lng: p.lng, href: p.href, title: `${p.name}, ${fmt(p.price)}`, label: fmt(p.price) };
        }
        const from = fmt(g.reduce((a, b) => (a.price.minor <= b.price.minor ? a : b)).price);
        return {
          id: `area:${g[0].area}`,
          lat: g[0].lat,
          lng: g[0].lng,
          href: g[0].areaHref,
          title: t("areaPinTitle", { area: g[0].area, count: g.length, price: from }),
          label: t("areaPinLabel", { count: g.length, price: from }),
        };
      })}
    />
  );
}

/** A detail page's area circle, with the landmarks around it for scale. */
export function AreaMap({ label, area, className }: { label: string; area: { lat: number; lng: number; radiusM: number }; className?: string }) {
  const landmarks = useLandmarks();
  return <TileMap label={label} area={area} landmarks={landmarks} className={className} />;
}
