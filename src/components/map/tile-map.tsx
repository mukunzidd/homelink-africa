"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * A slippy map in about two hundred lines, and no map library.
 *
 * The product needs three things from a map: where the results are, which one
 * the pointer is on, and roughly where a single place sits. Raster tiles, a
 * Web Mercator projection and absolutely positioned pins do all three; a map
 * SDK would add a dependency several times the size of this file for
 * interactions nobody here has asked for.
 *
 * Tiles are OpenStreetMap's standard raster layer, which needs no key for
 * light use with attribution. CARTO's basemaps were tried first, for their
 * ready-made dark style, and every tile came back as an "API KEY REQUIRED"
 * image — so the dark theme is a CSS filter over the tile layer instead
 * (`--map-filter` in globals.css). The URL template is an environment
 * variable: production traffic needs a tile provider agreement, and swapping
 * provider must not mean touching this file.
 *
 * Pan by dragging, zoom with the buttons or a double-click. The wheel scrolls
 * the page — a map that captures the wheel traps anyone scrolling past it.
 */

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label: React.ReactNode;
  href?: string;
  title: string;
};

const TILE = 256;
const TEMPLATE =
  process.env.NEXT_PUBLIC_MAP_TILES ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MIN_Z = 11;
const MAX_Z = 17;

function project(lat: number, lng: number, z: number) {
  const scale = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, z: number) {
  const scale = TILE * 2 ** z;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/** Metres per screen pixel at a latitude and zoom. */
function metresPerPx(lat: number, z: number) {
  return (156_543.033_92 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

function fit(points: { lat: number; lng: number }[], w: number, h: number, pad: number, maxZ: number, minZ = MIN_Z) {
  if (!points.length) return { center: { lat: -1.9536, lng: 30.0606 }, zoom: 12 };
  const lat = points.reduce((a, p) => a + p.lat, 0) / points.length;
  const lng = points.reduce((a, p) => a + p.lng, 0) / points.length;
  for (let z = maxZ; z >= minZ; z--) {
    const xs = points.map((p) => project(p.lat, p.lng, z));
    const spanX = Math.max(...xs.map((p) => p.x)) - Math.min(...xs.map((p) => p.x));
    const spanY = Math.max(...xs.map((p) => p.y)) - Math.min(...xs.map((p) => p.y));
    if (spanX <= w - pad * 2 && spanY <= h - pad * 2) {
      const cx = (Math.max(...xs.map((p) => p.x)) + Math.min(...xs.map((p) => p.x))) / 2;
      const cy = (Math.max(...xs.map((p) => p.y)) + Math.min(...xs.map((p) => p.y))) / 2;
      return { center: unproject(cx, cy, z), zoom: z };
    }
  }
  return { center: { lat, lng }, zoom: minZ };
}

/** A landmark drawn on the map: not a result, just a way to read the city. */
export type MapLandmark = { id: string; lat: number; lng: number; label: string };

export function TileMap({
  pins = [],
  area,
  activeId,
  onPinHover,
  maxZoom = 15,
  className,
  label,
  preview = false,
  landmarks = [],
  minZoom = MIN_Z,
}: {
  /** Reference points: the convention centre, the airport. Never fitted to. */
  landmarks?: MapLandmark[];
  /** The whole country needs to zoom out further than a city does. */
  minZoom?: number;
  /** A thumbnail: dots instead of price labels, no controls, no panning. */
  preview?: boolean;
  pins?: MapPin[];
  /** An approximate area instead of a pin: the place is somewhere in here. */
  area?: { lat: number; lng: number; radiusM: number };
  activeId?: string | null;
  onPinHover?: (id: string | null) => void;
  maxZoom?: number;
  className?: string;
  label: string;
}) {
  const t = useTranslations("map");
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The view the person has panned or zoomed to, remembered against the set
  // of points it was made for. When the points change, the map refits.
  const [moved, setMoved] = useState<{ key: string; center: { lat: number; lng: number }; zoom: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const fitPoints = useMemo(
    () => (area ? [{ lat: area.lat, lng: area.lng }] : pins.map((p) => ({ lat: p.lat, lng: p.lng }))),
    [area, pins],
  );
  const fitKey = fitPoints.map((p) => `${p.lat},${p.lng}`).join("|");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Refit when the set of things on the map changes, not when the pointer
  // moves between them — re-centring under someone's cursor is disorienting.
  const viewKey = `${fitKey}@${size.w}x${size.h}`;
  const fitted = useMemo(
    () => {
      if (!size.w || !size.h) return null;
      if (area) {
        // Zoom out until the whole circle fits with a margin: a 900 m
        // neighbourhood at street zoom filled the map edge to edge.
        let z = 15;
        while (z > minZoom && area.radiusM / metresPerPx(area.lat, z) > Math.min(size.w, size.h) / 2 - 28) z--;
        return { center: { lat: area.lat, lng: area.lng }, zoom: z };
      }
      return fit(fitPoints, size.w, size.h, 56, maxZoom, minZoom);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewKey],
  );
  const view = moved?.key === viewKey ? moved : fitted;
  const setView = useCallback(
    (next: { center: { lat: number; lng: number }; zoom: number }) => setMoved({ key: viewKey, ...next }),
    [viewKey],
  );

  const zoomBy = useCallback(
    (delta: number) => {
      if (view) setView({ center: view.center, zoom: Math.min(MAX_Z, Math.max(minZoom, view.zoom + delta)) });
    },
    [view, setView, minZoom],
  );

  const ready = view && size.w > 0;
  const z = view?.zoom ?? 12;
  const c = view ? project(view.center.lat, view.center.lng, z) : { x: 0, y: 0 };
  const originX = c.x - size.w / 2;
  const originY = c.y - size.h / 2;

  const tiles: { key: string; x: number; y: number; src: string }[] = [];
  if (ready) {
    const n = 2 ** z;
    const x0 = Math.floor(originX / TILE);
    const y0 = Math.floor(originY / TILE);
    const x1 = Math.floor((originX + size.w) / TILE);
    const y1 = Math.floor((originY + size.h) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        const sub = "abcd"[(Math.abs(tx) + Math.abs(ty)) % 4];
        tiles.push({
          key: `${z}/${tx}/${ty}`,
          x: tx * TILE - originX,
          y: ty * TILE - originY,
          src: TEMPLATE.replace("{s}", sub)
            .replace("{z}", String(z))
            .replace("{x}", String(wx))
            .replace("{y}", String(ty)),
        });
      }
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-map-control]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !view) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setView({ zoom: view.zoom, center: unproject(d.cx - dx, d.cy - dy, view.zoom) });
  }
  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={cn(
        "relative select-none overflow-hidden bg-surface-2",
        preview ? "pointer-events-none" : cn("touch-none", dragging ? "cursor-grabbing" : "cursor-grab"),
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-map-control]")) zoomBy(1);
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 [filter:var(--map-filter)]">
      {tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element -- third-party tiles; the optimiser would only proxy them
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          width={TILE}
          height={TILE}
          className="pointer-events-none absolute max-w-none"
          style={{ left: tile.x, top: tile.y, width: TILE, height: TILE }}
        />
      ))}
      </div>

      {ready && area && (() => {
        const p = project(area.lat, area.lng, z);
        const r = area.radiusM / metresPerPx(area.lat, z);
        return (
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-full border-2 border-brand bg-brand/15"
            style={{ left: p.x - originX - r, top: p.y - originY - r, width: r * 2, height: r * 2 }}
          />
        );
      })()}

      {ready && !preview &&
        placeLandmarks(
          landmarks.map((l) => {
            const p = project(l.lat, l.lng, z);
            return { ...l, x: p.x - originX, y: p.y - originY };
          }),
          pins.map((pin) => {
            const p = project(pin.lat, pin.lng, z);
            return { x: p.x - originX, y: p.y - originY, text: typeof pin.label === "string" ? pin.label : pin.title, active: pin.id === activeId };
          }),
          size,
        ).map((l) => (
          <span key={l.id} aria-hidden className="pointer-events-none absolute" style={{ left: l.x, top: l.y, zIndex: 5 }}>
            <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-[1.5px] border-surface bg-ink-2 shadow-[var(--shadow-card)]" />
            {l.side && (
              <span
                className={cn(
                  "absolute top-0 -translate-y-1/2 whitespace-nowrap rounded-inner bg-surface/90 px-1 py-px text-[11px] font-medium text-ink-2",
                  l.side === "right" ? "left-2" : "right-2",
                )}
              >
                {l.label}
              </span>
            )}
          </span>
        ))}

      {ready &&
        pins.map((pin) => {
          const p = project(pin.lat, pin.lng, z);
          const active = pin.id === activeId;
          if (preview) {
            return (
              <span
                key={pin.id}
                aria-hidden
                className={cn(
                  "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-[var(--shadow-card)] transition-transform",
                  active ? "scale-150 bg-ink" : "bg-brand",
                )}
                style={{ left: p.x - originX, top: p.y - originY }}
              />
            );
          }
          const body = (
            <span
              className={cn(
                "tnum inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px] font-semibold shadow-[var(--shadow-card)]",
                "transition-[transform,background-color,color] duration-150",
                active
                  ? "scale-110 border-[var(--float-line)] bg-[var(--float-bg)] text-[var(--float-ink)]"
                  : "border-line bg-surface text-ink hover:scale-105",
              )}
            >
              {pin.label}
            </span>
          );
          return (
            <div
              key={pin.id}
              data-map-control
              className="absolute -translate-x-1/2 -translate-y-full pb-1"
              style={{ left: p.x - originX, top: p.y - originY, zIndex: active ? 20 : 10 }}
              onMouseEnter={() => onPinHover?.(pin.id)}
              onMouseLeave={() => onPinHover?.(null)}
            >
              {pin.href ? (
                <Link href={pin.href} title={pin.title} aria-label={pin.title} className="block rounded-full">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}

      {!preview && <div data-map-control className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-ctl border border-line bg-surface shadow-[var(--shadow-card)]">
        <button type="button" aria-label={t("zoomIn")} onClick={() => zoomBy(1)} className="grid h-9 w-9 cursor-pointer place-items-center text-ink-2 hover:bg-surface-2 hover:text-ink">
          <PlusIcon />
        </button>
        <span className="h-px bg-line" />
        <button type="button" aria-label={t("zoomOut")} onClick={() => zoomBy(-1)} className="grid h-9 w-9 cursor-pointer place-items-center text-ink-2 hover:bg-surface-2 hover:text-ink">
          <MinusIcon />
        </button>
      </div>}

      {/* A thumbnail sits inside a link, and a link cannot hold another
          one, so there the credit is text. The full map links it. */}
      <p data-map-control className="absolute bottom-0 right-0 rounded-tl-inner bg-surface/85 px-1.5 py-0.5 text-[10px] text-ink-3">
        {preview ? (
          <>© OpenStreetMap {t("contributors")}</>
        ) : (
          <>
            ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              OpenStreetMap
            </a>{" "}
            {t("contributors")}
          </>
        )}
      </p>
    </div>
  );
}

/*
 * Landmark labels give way to prices.
 *
 * A landmark is context and a pin is the result, so where they meet the pin
 * keeps its label and the landmark tries its other side, then drops to a bare
 * diamond. Labels also give way to each other in order. Sizes are estimated
 * from the text length rather than measured: the map re-renders on every pan
 * frame, and a DOM measurement per label per frame costs more than a few
 * pixels of slack. The estimates err wide.
 */
type Box = { l: number; t: number; r: number; b: number };
const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function placeLandmarks<L extends MapLandmark & { x: number; y: number }>(
  landmarks: L[],
  pins: { x: number; y: number; text: string; active: boolean }[],
  size: { w: number; h: number },
): (L & { side: "right" | "left" | null })[] {
  // A pin is a pill anchored at its bottom centre: 12.5px semibold, 10px of
  // padding a side, and 4px of stem below. An active pin scales to 110%.
  const taken: Box[] = pins.map((p) => {
    const w = (p.text.length * 7.6 + 22) * (p.active ? 1.1 : 1);
    return { l: p.x - w / 2 - 2, t: p.y - 32, r: p.x + w / 2 + 2, b: p.y + 2 };
  });
  const out: (L & { side: "right" | "left" | null })[] = [];
  for (const l of landmarks) {
    if (l.x < -40 || l.y < -40 || l.x > size.w + 40 || l.y > size.h + 40) continue;
    const w = l.label.length * 6.3 + 10;
    const sides = {
      right: { l: l.x + 6, t: l.y - 9, r: l.x + 8 + w, b: l.y + 9 },
      left: { l: l.x - 8 - w, t: l.y - 9, r: l.x - 6, b: l.y + 9 },
    };
    const fits = (box: Box) => box.l >= 0 && box.r <= size.w && !taken.some((t) => hit(t, box));
    const side = fits(sides.right) ? "right" : fits(sides.left) ? "left" : null;
    if (side) taken.push(sides[side]);
    out.push({ ...l, side });
  }
  return out;
}
