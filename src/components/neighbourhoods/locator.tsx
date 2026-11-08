import type { GeoPoint } from "@/lib/domain/types";
import { LANDMARK_POINTS } from "@/lib/domain/landmarks";
import { cn } from "@/lib/cn";

/**
 * Where a neighbourhood sits in Kigali, drawn from the same centres the maps
 * use: every neighbourhood we list as a dot, this one ringed, the city centre
 * and the airport as small diamonds for bearings.
 *
 * It replaced a listing's interior photograph on the neighbourhood cards. A
 * bedroom says nothing about a neighbourhood, and the same photo appeared
 * again as a listing card further down the page. A tile map per card would
 * be eleven maps' worth of tiles for a page of thumbnails; this is the one
 * fact a card needs, in a few hundred bytes of SVG.
 */
export function Locator({
  points,
  current,
  label,
  className,
}: {
  points: { name: string; centre: GeoPoint }[];
  current: string;
  label: string;
  className?: string;
}) {
  const bearings = [LANDMARK_POINTS.cityCentre, LANDMARK_POINTS.airport];
  const all = [...points.map((p) => p.centre), ...bearings];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const W = 320;
  const H = 160;
  const pad = 22;
  // Equal scale on both axes, so Kigali keeps its shape at any card width.
  const scale = Math.min((W - pad * 2) / (maxLng - minLng || 1), (H - pad * 2) / (maxLat - minLat || 1));
  const ox = (W - (maxLng - minLng) * scale) / 2;
  const oy = (H - (maxLat - minLat) * scale) / 2;
  const x = (p: GeoPoint) => ox + (p.lng - minLng) * scale;
  const y = (p: GeoPoint) => oy + (maxLat - p.lat) * scale;
  const here = points.find((p) => p.name === current);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet" className={cn("block w-full bg-surface-2", className)}>
      <defs>
        <pattern id="locator-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="var(--line)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#locator-grid)" />
      {bearings.map((b, i) => (
        <rect key={i} x={x(b) - 3} y={y(b) - 3} width="6" height="6" transform={`rotate(45 ${x(b)} ${y(b)})`} fill="var(--ink-3)" opacity="0.7" />
      ))}
      {points.filter((p) => p.name !== current).map((p) => (
        <circle key={p.name} cx={x(p.centre)} cy={y(p.centre)} r="3.5" fill="var(--ink-3)" opacity="0.55" />
      ))}
      {here && (
        <g>
          <circle cx={x(here.centre)} cy={y(here.centre)} r="15" fill="var(--brand)" opacity="0.14" />
          <circle cx={x(here.centre)} cy={y(here.centre)} r="6" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
