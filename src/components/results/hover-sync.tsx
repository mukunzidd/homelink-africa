"use client";

import { createContext, useContext, useState } from "react";

/**
 * Which result the pointer is on, shared between the list and the map.
 *
 * The rows are server components and stay that way; each is wrapped in a
 * thin client element that reports hover, so the list does not have to
 * become a client tree just to light up a pin.
 */
const HoverContext = createContext<{ id: string | null; set: (id: string | null) => void }>({
  id: null,
  set: () => {},
});

export function HoverSyncProvider({ children }: { children: React.ReactNode }) {
  const [id, set] = useState<string | null>(null);
  return <HoverContext.Provider value={{ id, set }}>{children}</HoverContext.Provider>;
}

export const useHoverSync = () => useContext(HoverContext);

export function HoverTarget({ id, children }: { id: string; children: React.ReactNode }) {
  const { id: active, set } = useHoverSync();
  return (
    <div
      onMouseEnter={() => set(id)}
      onMouseLeave={() => set(null)}
      onFocusCapture={() => set(id)}
      data-active={active === id || undefined}
      // A grid of one, so the card inside stretches to the row's height when
      // the map view lays results out in columns. The ring follows the card's
      // own radius rather than a tighter one that showed at the corners.
      className="grid rounded-card transition-shadow duration-150 data-[active]:shadow-[0_0_0_2px_var(--brand)]"
    >
      {children}
    </div>
  );
}
