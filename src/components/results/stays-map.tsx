"use client";

import { useTranslations } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { LANDMARK_KEYS, LANDMARK_POINTS } from "@/lib/domain/landmarks";
import { TileMap, type MapLandmark } from "@/components/map/tile-map";
import { useHoverSync } from "./hover-sync";

export type StayPin = { id: string; lat: number; lng: number; price: Money; href: string; name: string };

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

  return (
    <TileMap
      label={t("resultsLabel", { count: pins.length })}
      activeId={id}
      onPinHover={set}
      className={className}
      preview={preview}
      landmarks={landmarks}
      maxZoom={preview ? 13 : 15}
      pins={pins.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        href: p.href,
        title: `${p.name}, ${fmt(p.price)}`,
        label: fmt(p.price),
      }))}
    />
  );
}

/** A detail page's area circle, with the landmarks around it for scale. */
export function AreaMap({ label, area, className }: { label: string; area: { lat: number; lng: number; radiusM: number }; className?: string }) {
  const landmarks = useLandmarks();
  return <TileMap label={label} area={area} landmarks={landmarks} className={className} />;
}
