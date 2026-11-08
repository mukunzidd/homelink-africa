import type { ServiceKind } from "./types";
import type { Money } from "./money";
import { EXTRAS, type ExtraKey } from "./extras";
import { DEFAULT_PROMOS, type PromoSetting } from "./promo";

/**
 * What admin can change about prices without touching code: each extra's
 * price and whether it is offered, the promo codes, and how many days
 * before arrival cancelling is free in each lane.
 *
 * Passed into the pricing functions rather than read by them, so the
 * browser and the server price with the same catalog: the server reads it
 * from settings, and the booking pages hand the same object to the page.
 * Every function falls back to DEFAULT_CATALOG, which is today's constants.
 */
export type ExtraSetting = { price: Money; enabled: boolean };
export type PricingCatalog = {
  extras: Partial<Record<ExtraKey, ExtraSetting>>;
  promos: Record<string, PromoSetting>;
  windows: Record<ServiceKind, number>;
};

export const DEFAULT_CATALOG: PricingCatalog = {
  extras: Object.fromEntries((Object.keys(EXTRAS) as ExtraKey[]).map((k) => [k, { price: EXTRAS[k].price, enabled: true }])),
  promos: DEFAULT_PROMOS,
  windows: { stay: 7, car: 2, experience: 3 },
};
