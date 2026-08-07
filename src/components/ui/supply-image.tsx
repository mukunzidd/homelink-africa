import { cn } from "@/lib/cn";

/**
 * Placeholder for real photography.
 *
 * The verification promise says HomeLink shoots every listing itself, so no
 * stock imagery belongs here — a shot we did not take would contradict the
 * product. Until the shooting standard exists (a separate document and a real
 * operational cost), each item gets a deterministic gradient derived from its
 * seed, so the same listing always looks the same.
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
  className,
  children,
}: {
  seed: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        ramp(seed),
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(118%_90%_at_20%_10%,rgba(111,207,165,0.34),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent"
      />
      {children}
    </div>
  );
}
