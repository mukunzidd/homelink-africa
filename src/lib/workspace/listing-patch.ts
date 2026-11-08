import type { Listing } from "@/lib/domain/types";

/** What the listing editor may change. Location, slug and the inspection record are not here on purpose. */
export type ListingPatch = Partial<
  Pick<Listing, "name" | "summary" | "amenities" | "houseRules" | "nightlyRate" | "monthlyRate" | "leaseTerms" | "modes" | "images" | "propertyManager" | "checkIn" | "bedrooms" | "sleeps" | "minNights">
>;

export type PatchError = "name" | "nightlyRate" | "monthlyRate" | "sleeps" | "bedrooms" | "modes" | "minNights";

/**
 * The rules a saved home must keep, checked against the patch merged onto
 * what is there now, so a patch to bedrooms alone still has to fit the
 * current sleeps. Returns the fields that are wrong; empty means it saves.
 */
export function listingPatchErrors(
  patch: ListingPatch,
  current: Pick<Listing, "bedrooms" | "sleeps" | "modes"> & Partial<Pick<Listing, "monthlyRate">>,
): PatchError[] {
  const next = { ...current, ...patch };
  const errors = new Set<PatchError>();
  if (patch.name !== undefined && !patch.name.trim()) errors.add("name");
  if (patch.nightlyRate !== undefined && !(patch.nightlyRate.minor > 0)) errors.add("nightlyRate");
  if (patch.monthlyRate !== undefined && !(patch.monthlyRate.minor > 0)) errors.add("monthlyRate");
  if (!Number.isInteger(next.bedrooms) || next.bedrooms < 0 || next.bedrooms > 20) errors.add("bedrooms");
  // A bedroom sleeps at least one; a studio (0 bedrooms) still sleeps one.
  if (!Number.isInteger(next.sleeps) || next.sleeps < Math.max(1, next.bedrooms) || next.sleeps > 40) errors.add("sleeps");
  if (!next.modes.length) errors.add("modes");
  if (next.modes.includes("lease") && !next.monthlyRate) errors.add("monthlyRate");
  if (patch.minNights !== undefined && (!Number.isInteger(patch.minNights) || patch.minNights < 1 || patch.minNights > 30)) errors.add("minNights");
  return [...errors];
}
