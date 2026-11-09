"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_CATALOG, type PricingCatalog } from "@/lib/domain/catalog";

const Ctx = createContext<PricingCatalog>(DEFAULT_CATALOG);

/**
 * The catalog admin set in settings, handed to a booking flow by its server
 * page, so the browser prices extras and codes exactly as the server will.
 * Without a provider, today's constants: the same fallback the server uses.
 */
export function CatalogProvider({ catalog, children }: { catalog: PricingCatalog; children: ReactNode }) {
  return <Ctx.Provider value={catalog}>{children}</Ctx.Provider>;
}

export const useCatalog = () => useContext(Ctx);
