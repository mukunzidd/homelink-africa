"use client";

import { useTranslations } from "next-intl";
import { TileMap } from "@/components/map/tile-map";

export type DayPin = { id: string; lat: number; lng: number; href: string; name: string; place: string; driveHours: number };

/**
 * Days out, on a map of Rwanda with Kigali in the middle.
 *
 * "How far is it" is the first question about a gorilla trek, and the cards
 * did not answer it. Each pin carries the drive from Kigali, so the shape of
 * the country and the cost of a day in a car are read at once.
 */
export function DaysMap({ pins, className }: { pins: DayPin[]; className?: string }) {
  const t = useTranslations("list");
  return (
    <TileMap
      label={t("daysMapLabel")}
      className={className}
      minZoom={7}
      maxZoom={9}
      pins={pins.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        href: p.href,
        title: `${p.name}, ${t("driveFromKigali", { hours: p.driveHours })}`,
        label: (
          <>
            {p.place} <span className="font-normal text-ink-3">· {p.driveHours < 1 ? t("inKigali") : t("hoursShort", { hours: p.driveHours })}</span>
          </>
        ),
      }))}
    />
  );
}
