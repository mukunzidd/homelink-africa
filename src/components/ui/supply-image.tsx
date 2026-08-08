import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The single place a supply item's photograph is rendered.
 *
 * Two modes, deliberately. Given `src` it renders a real photograph; given
 * only a seed it falls back to a deterministic gradient. The fallback is not
 * a loading state — it is what an item legitimately looks like before our team
 * has photographed it, and it is honest about that rather than borrowing
 * somebody else's picture of somebody else's property.
 *
 * When photography moves to Supabase Storage the fixture paths become storage
 * URLs and this component does not change.
 */
const RAMPS = [
  "from-[#1E7A57] via-[#14684A] to-[#0B3A2A]",
  "from-[#2A8A63] via-[#166B4D] to-[#082A1E]",
  "from-[#17714F] via-[#105C40] to-[#0A3326]",
  "from-[#248063] via-[#125A43] to-[#07231A]",
  "from-[#1B6E52] via-[#0F5239] to-[#0A2C21]",
];

function ramp(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return RAMPS[hash % RAMPS.length];
}

export function SupplyImage({
  seed,
  src,
  alt = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  className,
  children,
}: {
  seed: string;
  /** A real photograph. Absent means none has been taken yet. */
  src?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <>
          <div
            aria-hidden="true"
            className={cn("absolute inset-0 bg-gradient-to-br", ramp(seed))}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(118%_90%_at_20%_10%,rgba(111,207,165,0.34),transparent_60%)]"
          />
        </>
      )}

      {/* Keeps a verified badge legible over a bright photograph. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent"
      />
      {children}
    </div>
  );
}
