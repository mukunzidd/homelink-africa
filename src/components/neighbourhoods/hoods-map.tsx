"use client";

import { TileMap } from "@/components/map/tile-map";
import { useLandmarks } from "@/components/results/stays-map";
import type { GeoPoint } from "@/lib/domain/types";

/** Every neighbourhood we list, on one map, each pin a link to its page. */
export function HoodsMap({
  label,
  hoods,
  className,
}: {
  label: string;
  hoods: { name: string; slug: string; centre: GeoPoint; places: number }[];
  className?: string;
}) {
  const landmarks = useLandmarks();
  return (
    <TileMap
      label={label}
      className={className}
      landmarks={landmarks}
      maxZoom={14}
      pins={hoods.map((h) => ({
        id: h.slug,
        lat: h.centre.lat,
        lng: h.centre.lng,
        href: `/neighbourhoods/${h.slug}`,
        title: h.name,
        label: h.name,
      }))}
    />
  );
}
