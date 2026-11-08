"use client";

import { useEffect } from "react";
import { recordViewed, type Viewed } from "@/lib/recently-viewed";

/** Remembers a detail page for the search window's "Recently viewed". */
export function ViewTracker(props: Omit<Viewed, "at">) {
  const { href, name, kind, image } = props;
  useEffect(() => {
    recordViewed({ href, name, kind, image });
  }, [href, name, kind, image]);
  return null;
}
