import { nightsBetween } from "@/lib/domain/dates";

/**
 * Where a document stands on a given day. Thirty days or fewer to go is
 * "expiring soon", time to renew; on the day it runs out it is already
 * expired, because a licence that ends today cannot be driven on tonight.
 */
export function expiryState(expires: string, today: string): "valid" | "expiringSoon" | "expired" {
  const left = nightsBetween(today, expires);
  if (left <= 0) return "expired";
  if (left <= 30) return "expiringSoon";
  return "valid";
}
