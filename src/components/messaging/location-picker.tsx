"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { SharedLocation } from "@/lib/domain/types";
import { searchPlaces, streetAddress, type Place } from "@/lib/places/gazetteer";
import { Dialog } from "@/components/ui/dialog";
import { TileMap } from "@/components/map/tile-map";
import { CompassIcon, MapIcon, PinIcon, RoadIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const KIGALI = { lat: -1.9441, lng: 30.0619, zoom: 13 };
const KIND_ICON = { landmark: PinIcon, transport: RoadIcon, neighbourhood: MapIcon } as const;

type Locating = "idle" | "busy" | "denied" | "unavailable";

/**
 * Where to meet, picked three ways that all end on the same pin: search a
 * place by name, type a Kigali street address, or use where the phone is.
 * Whichever way, the map is the last word: the pin sits in the middle and
 * the map moves under it, so a bus park becomes the gate by the kiosk.
 *
 * The name and the directions are what the other person reads first; the
 * point is what their maps app opens.
 */
export function LocationPicker({
  open,
  onClose,
  onShare,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onShare: (location: SharedLocation) => void;
  busy: boolean;
}) {
  const t = useTranslations("messaging.location");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number }>(KIGALI);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState<Locating>("idle");
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => searchPlaces(query), [query]);
  const street = useMemo(() => streetAddress(query), [query]);
  const onCenterChange = useCallback((c: { lat: number; lng: number }) => setCenter(c), []);

  function choose(p: Place) {
    setFocus({ lat: p.lat, lng: p.lng, zoom: p.kind === "neighbourhood" ? 15 : 17 });
    setName(p.name);
    setQuery(p.name);
    setShowResults(false);
  }

  function chooseStreet() {
    if (!street) return;
    setFocus({ ...street.center, zoom: 14 });
    setAddress(query.trim());
    setName("");
    setShowResults(false);
  }

  function takeTyped() {
    setAddress(query.trim());
    setShowResults(false);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocating("unavailable");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 17 });
        setName("");
        setLocating("idle");
      },
      (err) => setLocating(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  function reset() {
    setQuery("");
    setFocus(KIGALI);
    setName("");
    setAddress("");
    setLocating("idle");
    setShowResults(false);
  }

  const q = query.trim();
  const listOpen = showResults && q.length >= 2;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("title")}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="min-h-11 cursor-pointer rounded-ctl border border-line px-4 text-[15px] font-semibold text-ink hover:bg-surface-2"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={!center || busy}
            onClick={() => {
              if (!center) return;
              onShare({ ...center, name: name.trim(), address: address.trim() });
              reset();
            }}
            className="min-h-11 cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("share")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <label htmlFor="place-search" className="sr-only">
            {t("search")}
          </label>
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            id="place-search"
            type="search"
            autoComplete="off"
            value={query}
            placeholder={t("search")}
            role="combobox"
            aria-expanded={listOpen}
            aria-controls="place-results"
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (street) chooseStreet();
                else if (results[0]) choose(results[0]);
                else if (q.length >= 3) takeTyped();
              }
            }}
            className="h-11 w-full rounded-ctl border border-line bg-surface pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
          />
          {listOpen && (
            <ul
              id="place-results"
              role="listbox"
              className="absolute inset-x-0 top-[calc(100%+4px)] z-40 flex max-h-72 flex-col overflow-y-auto rounded-card border border-line bg-surface p-1 shadow-[var(--shadow-pop)]"
            >
              {street && (
                <li role="option" aria-selected={false}>
                  <button type="button" onClick={chooseStreet} className="flex w-full cursor-pointer items-start gap-3 rounded-inner px-3 py-2 text-left hover:bg-surface-2">
                    <RoadIcon size={16} className="mt-0.5 text-brand" />
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold text-ink">{street.code}</span>
                      <span className="text-[12.5px] text-ink-3">{t("streetHint", { district: street.district })}</span>
                    </span>
                  </button>
                </li>
              )}
              {results.map((p) => {
                const Icon = KIND_ICON[p.kind];
                return (
                  <li key={p.id} role="option" aria-selected={false}>
                    <button type="button" onClick={() => choose(p)} className="flex w-full cursor-pointer items-start gap-3 rounded-inner px-3 py-2 text-left hover:bg-surface-2">
                      <Icon size={16} className="mt-0.5 text-ink-3" />
                      <span className="flex flex-col">
                        <span className="text-[14px] font-semibold text-ink">{p.name}</span>
                        <span className="text-[12.5px] text-ink-3">
                          {t(`kinds.${p.kind}`)} · {p.area}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {!street && q.length >= 3 && (
                <li role="option" aria-selected={false}>
                  <button type="button" onClick={takeTyped} className="flex w-full cursor-pointer items-start gap-3 rounded-inner px-3 py-2 text-left hover:bg-surface-2">
                    <PinIcon size={16} className="mt-0.5 text-ink-3" />
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold text-ink">{t("useTyped", { text: q })}</span>
                      <span className="text-[12.5px] text-ink-3">{results.length ? t("useTypedHint") : t("noMatch")}</span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={locate}
            disabled={locating === "busy"}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink-2 hover:border-brand hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            <CompassIcon size={15} className="text-brand" />
            {locating === "busy" ? t("locating") : t("useMine")}
          </button>
          {(locating === "denied" || locating === "unavailable") && (
            <p role="alert" className="text-[12.5px] text-warn">
              {t(locating)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <TileMap
            label={t("mapLabel")}
            focus={focus}
            crosshair
            onCenterChange={onCenterChange}
            minZoom={11}
            className={cn("h-[280px] rounded-card border border-line sm:h-[320px]")}
          />
          <p className="flex flex-wrap justify-between gap-2 text-[12px] text-ink-3">
            <span>{t("mapHint")}</span>
            {center && <span className="tnum font-mono">{center.lat.toFixed(5)}, {center.lng.toFixed(5)}</span>}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-ink-2">{t("name")}</span>
            <input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="h-10 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-ink-2">{t("address")}</span>
            <input
              value={address}
              maxLength={200}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
              className="h-10 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
            />
          </label>
        </div>
      </div>
    </Dialog>
  );
}
