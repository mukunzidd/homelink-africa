import type { SharedLocation } from "@/lib/domain/types";
import { TileMap } from "@/components/map/tile-map";
import { ArrowRightIcon, PinIcon } from "@/components/ui/icons";

/**
 * A shared place in the transcript: a small map, the name, the directions
 * as written, and the two things people do next, in the maps app they
 * already use. Google Maps, because that is the one on the phones of the
 * drivers and guests this is for; the link works without it installed.
 */
export function LocationCard({
  location,
  labels,
}: {
  location: SharedLocation;
  labels: { shared: string; open: string; directions: string; map: string };
}) {
  const at = `${location.lat},${location.lng}`;
  const open = `https://www.google.com/maps/search/?api=1&query=${at}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${at}`;
  return (
    <div className="mt-1 flex w-[min(320px,100%)] flex-col overflow-hidden rounded-inner border border-line bg-surface">
      <a href={open} target="_blank" rel="noopener noreferrer" aria-label={labels.map} className="block">
        <TileMap
          label={labels.map}
          preview
          pins={[{ id: "here", lat: location.lat, lng: location.lng, label: "", title: location.name || labels.shared }]}
          maxZoom={16}
          className="h-36 w-full"
        />
      </a>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
          <PinIcon size={14} className="flex-none text-brand" />
          {location.name || labels.shared}
        </p>
        {location.address && <p className="text-[13px] leading-snug text-ink-2">{location.address}</p>}
        <p className="tnum font-mono text-[11.5px] text-ink-3">
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>
      </div>
      <div className="grid grid-cols-2 border-t border-line-soft text-[13px] font-semibold">
        <a href={open} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-center text-brand hover:bg-surface-2">
          {labels.open}
        </a>
        <a href={directions} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 border-l border-line-soft px-3 py-2 text-brand hover:bg-surface-2">
          {labels.directions}
          <ArrowRightIcon size={13} />
        </a>
      </div>
    </div>
  );
}
