/**
 * A candidate design's own words, in all four languages, kept beside the
 * design while it is a candidate. Five designs written at once cannot share
 * the four message files without overwriting each other. The one that is
 * picked moves its words into messages/*.json like every other screen.
 */
export type DesignCopy<T> = Record<"en" | "fr" | "rw" | "sw", T>;

export function pick<T>(copy: DesignCopy<T>, locale: string): T {
  return copy[(locale in copy ? locale : "en") as keyof DesignCopy<T>];
}
