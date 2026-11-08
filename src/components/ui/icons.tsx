/**
 * Inline icons, 1.5px stroke on a 20px grid.
 *
 * Stroke weight matches the UI face at its usual sizes — a heavier icon next
 * to 13-14px text reads as a different system. Everything inherits
 * `currentColor` so icons follow whatever token their container sets, in both
 * themes, without a second set of assets.
 */
type IconProps = {
  className?: string;
  size?: number;
};

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: `flex-none ${className ?? ""}`,
  };
}

/** Arriving from outside Rwanda. */
export function PlaneIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.2 2.2a1 1 0 0 1 1.9 0l1 4.6 4.7 2.4a1 1 0 0 1 0 1.6l-4.7 2.4-1 4.6a1 1 0 0 1-1.9 0" />
      <path d="M10.2 2.2 9.2 6.8 4.5 9.2a1 1 0 0 0 0 1.6l4.7 2.4 1 4.6" />
    </svg>
  );
}

/** Already in the country. */
export function PinIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M16 8.3c0 4.2-6 9.4-6 9.4s-6-5.2-6-9.4a6 6 0 1 1 12 0Z" />
      <circle cx="10" cy="8.2" r="2.1" />
    </svg>
  );
}

/** Language. */
export function GlobeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="7.4" />
      <path d="M2.6 10h14.8" />
      <path d="M10 2.6c1.9 2 3 4.7 3 7.4s-1.1 5.4-3 7.4c-1.9-2-3-4.7-3-7.4s1.1-5.4 3-7.4Z" />
    </svg>
  );
}

/** Currency. Deliberately a note rather than a symbol — no single glyph
 *  covers RWF, USD, EUR and GBP without privileging one of them. */
export function BanknoteIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2.4" y="5.4" width="15.2" height="9.2" rx="1.6" />
      <circle cx="10" cy="10" r="2.1" />
      <path d="M5.4 8v4M14.6 8v4" />
    </svg>
  );
}

export function SunIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.4v1.8M10 15.8v1.8M17.6 10h-1.8M4.2 10H2.4M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3M15.4 15.4l-1.3-1.3M5.9 5.9 4.6 4.6" />
    </svg>
  );
}

export function MoonIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M16.4 11.6A6.9 6.9 0 0 1 8.4 3.6a7 7 0 1 0 8 8Z" />
    </svg>
  );
}

/** Following the operating system. */
export function MonitorIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2.6" y="4" width="14.8" height="9.6" rx="1.6" />
      <path d="M7.2 17h5.6M10 13.6V17" />
    </svg>
  );
}

export function ChevronDownIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 8.4 10 12.4l4-4" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4.5 6.5 10l5.5 5.5" />
    </svg>
  );
}

export function ChevronRightIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 4.5 13.5 10 8 15.5" />
    </svg>
  );
}

export function CalendarIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4.4" width="14" height="12.6" rx="1.8" />
      <path d="M3 8.2h14M7 2.8v3M13 2.8v3" />
    </svg>
  );
}

export function SearchIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="9" r="5.6" />
      <path d="m13.2 13.2 3.6 3.6" />
    </svg>
  );
}

export function UsersIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="8" cy="7" r="2.8" />
      <path d="M3 16.4a5 5 0 0 1 10 0" />
      <path d="M13.4 4.6a2.8 2.8 0 0 1 0 5.2M14.6 16.4a5 5 0 0 0-1.4-3.5" />
    </svg>
  );
}

export function SortIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 4.5v11M5 15.5 2.6 13M5 4.5 7.4 7" />
      <path d="M11 6h6M11 10h4.5M11 14h3" />
    </svg>
  );
}

export function CarIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 12.4h14M4.4 12.4V9.2l1.5-3.4A1.4 1.4 0 0 1 7.2 5h5.6a1.4 1.4 0 0 1 1.3.8l1.5 3.4v3.2" />
      <path d="M3.6 12.4v2.2h2.6v-2.2M13.8 12.4v2.2h2.6v-2.2" />
      <path d="M4.4 9.2h11.2" />
    </svg>
  );
}

export function CompassIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="7.4" />
      <path d="m12.8 7.2-1.6 4-4 1.6 1.6-4Z" />
    </svg>
  );
}

export function ClockIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="7.4" />
      <path d="M10 5.8V10l2.8 1.8" />
    </svg>
  );
}

export function ExpandIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7.6 2.8H2.8v4.8M12.4 2.8h4.8v4.8M12.4 17.2h4.8v-4.8M7.6 17.2H2.8v-4.8" />
    </svg>
  );
}

/** Collapsed state of the preview bar: settings without implying a page. */
export function SlidersIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 6h9M15 6h2M3 14h2M8 14h9" />
      <circle cx="13.5" cy="6" r="1.9" />
      <circle cx="6.5" cy="14" r="1.9" />
    </svg>
  );
}

export function CloseIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

/* ---- amenity glyphs. A dot next to "Backup power" says nothing; these do. -- */

export function BoltIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M11.2 2.4 4.6 11h4.2l-1 6.6L14.4 9h-4.2z" />
    </svg>
  );
}

export function WifiIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.6 7.6a11 11 0 0 1 14.8 0M5.4 10.6a7 7 0 0 1 9.2 0M8.2 13.6a3 3 0 0 1 3.6 0" />
      <circle cx="10" cy="16.4" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BedIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.6 15V6M2.6 11h14.8v4M17.4 11V9.4a2 2 0 0 0-2-2H9.2V11" />
      <circle cx="6" cy="9.2" r="1.6" />
    </svg>
  );
}

export function DropletIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 2.6s5 5.2 5 8.6a5 5 0 0 1-10 0c0-3.4 5-8.6 5-8.6Z" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 2.6 4 5v4.6c0 3.6 2.5 6.4 6 7.8 3.5-1.4 6-4.2 6-7.8V5z" />
    </svg>
  );
}

export function LeafIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.6 16.4C3 11 6.4 4.6 16.4 3.6c1 10-5.4 13.4-10.8 12.8" />
      <path d="M3.6 16.4c2.6-2.8 5.6-5 9.2-6.6" />
    </svg>
  );
}

export function LaptopIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="4.4" width="12" height="8.2" rx="1.4" />
      <path d="M2.4 15.6h15.2" />
    </svg>
  );
}

/** The gallery opener: a grid of frames, not a magnifier. */
export function GridIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="6" height="6" rx="1.2" />
      <rect x="11" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="11" width="6" height="6" rx="1.2" />
      <rect x="11" y="11" width="6" height="6" rx="1.2" />
    </svg>
  );
}

/** The lease lane: a key is a tenancy, a bed is a night. */
export function KeyIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="6.6" cy="13.4" r="3.4" />
      <path d="M9 11 16.4 3.6M13.6 6.4l2 2M11.8 8.2l2 2" />
    </svg>
  );
}

/* ---- lane glyphs. A car and a trek earn different facts, so different marks. -- */

/** Not the tarmac. Half the roads worth driving here stop being roads. */
export function RoadIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7.6 2.8 3.2 17.2M12.4 2.8l4.4 14.4" />
      <path d="M10 4v2.6M10 9v2.6M10 14v2.6" />
    </svg>
  );
}

/** Transmission. The gate of a shift pattern, which is the thing an automatic
 *  spares you on a hill that has stopped moving. */
export function GearIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5.4 4.6v10.8M14.6 4.6v10.8M5.4 10h9.2" />
      <circle cx="5.4" cy="3.4" r="1.2" />
      <circle cx="14.6" cy="3.4" r="1.2" />
      <circle cx="5.4" cy="16.6" r="1.2" />
      <circle cx="14.6" cy="16.6" r="1.2" />
    </svg>
  );
}

/** Food that is part of the day rather than a stop on it. */
export function BowlIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.8 8.2h14.4a7.2 7.2 0 0 1-14.4 0Z" />
      <path d="M7.6 5.4c0-1.3 1-1.7 1-2.8M11.4 5.4c0-1.3 1-1.7 1-2.8" />
    </svg>
  );
}

/** Attaching a photograph to a message. */
export function PaperclipIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M15.6 9.4 9.9 15.1a3.6 3.6 0 0 1-5.1-5.1l6.4-6.4a2.4 2.4 0 0 1 3.4 3.4l-6.4 6.4a1.2 1.2 0 0 1-1.7-1.7l5.7-5.7" />
    </svg>
  );
}

export function ShareIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 13V3M10 3 6.6 6.4M10 3l3.4 3.4" />
      <path d="M4 11.6v3.8a1.6 1.6 0 0 0 1.6 1.6h8.8a1.6 1.6 0 0 0 1.6-1.6v-3.8" />
    </svg>
  );
}

export function HeartIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 16.4S3.2 12.6 3.2 8a3.6 3.6 0 0 1 6.8-1.7A3.6 3.6 0 0 1 16.8 8c0 4.6-6.8 8.4-6.8 8.4Z" />
    </svg>
  );
}

/** Smart search. Two marks, not a cluster of stars: it reads, not sparkles. */
export function SparkIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8.5 3.2 9.7 7a2 2 0 0 0 1.3 1.3l3.8 1.2-3.8 1.2a2 2 0 0 0-1.3 1.3l-1.2 3.8-1.2-3.8A2 2 0 0 0 6 10.7L2.2 9.5 6 8.3A2 2 0 0 0 7.3 7Z" />
      <path d="M15.2 2.6v3M13.7 4.1h3" />
    </svg>
  );
}

export function MapIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7.4 3.4 2.8 5v11.6l4.6-1.6 5.2 1.6 4.6-1.6V3.4L12.6 5Z" />
      <path d="M7.4 3.4V15M12.6 5v11.6" />
    </svg>
  );
}

export function ListIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 5.5h9.5M7 10h9.5M7 14.5h9.5" />
      <path d="M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" strokeWidth={2.2} />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
    </svg>
  );
}

export function HistoryIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.3 10a6.7 6.7 0 1 0 2-4.8L3.3 7.2" />
      <path d="M3.3 3.6v3.6h3.6M10 6.6V10l2.4 1.6" />
    </svg>
  );
}

export function PlusIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

export function MinusIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4.5 10h11" />
    </svg>
  );
}

export function CheckIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m4.5 10.4 3.6 3.6 7.4-8" />
    </svg>
  );
}

export function MenuIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
    </svg>
  );
}

/** Buying: a house, as opposed to a bed (a night) or a key (a lease). */
export function HouseIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.5 9 10 3.8 16.5 9" />
      <path d="M5.2 7.8v8.4h9.6V7.8" />
      <path d="M8.4 16.2v-4.4h3.2v4.4" />
    </svg>
  );
}

export function HomeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.2 9.2 10 3.6l6.8 5.6" />
      <path d="M5 7.8V16h10V7.8" />
    </svg>
  );
}

/** A photograph count on a thumbnail. */
export function ImageIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7.5" cy="8.5" r="1.25" />
      <path d="m3.5 14.5 4-4 3 3 2-2 4 4" />
    </svg>
  );
}

/** Tell me when one is listed. */
export function BellIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4l1.5-1.5Z" />
      <path d="M8.5 17a1.75 1.75 0 0 0 3 0" />
    </svg>
  );
}

/** Side by side. */
export function ColumnsIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M10 4v12" />
    </svg>
  );
}

/** A drive or travel time. */
export function RouteIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="5.5" cy="15" r="1.75" />
      <circle cx="14.5" cy="5" r="1.75" />
      <path d="M7.25 15h5a2.5 2.5 0 0 0 0-5h-4.5a2.5 2.5 0 0 1 0-5h5" />
    </svg>
  );
}

/** A landmark the city is navigated by. */
export function FlagIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 17V3.5" />
      <path d="M5 4h9l-1.75 3L14 10H5" />
    </svg>
  );
}

/** A note on a saved item. */
export function NoteIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v7L11.5 16h-6A1.5 1.5 0 0 1 4 14.5v-10Z" />
      <path d="M11.5 16v-3a1.5 1.5 0 0 1 1.5-1.5h3" />
      <path d="M7 7h6M7 10h3.5" />
    </svg>
  );
}

/** A conversation. */
export function MessageIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5v-6Z" />
    </svg>
  );
}
