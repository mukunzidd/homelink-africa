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
