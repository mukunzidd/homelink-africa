import type { Amenity } from "@/lib/domain/types";
import {
  BedIcon,
  BoltIcon,
  CarIcon,
  DropletIcon,
  LaptopIcon,
  LeafIcon,
  ShieldIcon,
  WifiIcon,
} from "@/components/ui/icons";

/**
 * A glyph per amenity, because a row of identical dots carries no information.
 *
 * These are the things people in Kigali actually ask about before booking —
 * whether the power holds, whether the water tank is real, whether the fibre
 * is fibre — so each deserves to be recognisable at a glance rather than read.
 */
const ICONS: Record<Amenity, React.ComponentType<{ size?: number; className?: string }>> = {
  backupPower: BoltIcon,
  fibre: WifiIcon,
  furnished: BedIcon,
  parking: CarIcon,
  water: DropletIcon,
  security: ShieldIcon,
  garden: LeafIcon,
  workspace: LaptopIcon,
};

export function AmenityIcon({
  amenity,
  size = 20,
  className,
}: {
  amenity: Amenity;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[amenity];
  return <Icon size={size} className={className} />;
}
