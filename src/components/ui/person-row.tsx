/**
 * A named human, given a face.
 *
 * Initials rather than a photograph: a fabricated headshot on a page about
 * verification would be exactly the wrong lie to tell.
 *
 * `tone` separates the two kinds of person a detail page can name, and the
 * separation is load-bearing. The trust ring belongs to our inspector — the
 * person the guest is actually trusting. A guide is who you spend the day
 * with, not who vouches for it, so they get a plain neutral disc.
 *
 * The first attempt used brand green for the guide. Measured on the page, it
 * was invisible: this is a single-hue system and `brand-tint` sits a couple of
 * percent off `trust-tint` in both themes. The tokens already say how to
 * separate two things without a second colour — depth and form — so the
 * distinction is now the ring, which is the one mark reserved for a promise.
 */
export function PersonRow({
  name,
  title,
  detail,
  tone = "trust",
}: {
  /** The bare name. Initials come from here, never from the display line —
   *  "Verified by Jean-Claude U." would otherwise put VB in the circle. */
  name: string;
  /** Display line. Defaults to the name where nothing prefixes it. */
  title?: string;
  detail: string;
  tone?: "trust" | "neutral";
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className={
          tone === "trust"
            ? "grid size-12 flex-none place-items-center rounded-full border-[1.5px] border-trust/55 bg-trust-tint text-[15px] font-semibold text-trust"
            : "grid size-12 flex-none place-items-center rounded-full bg-surface-2 text-[15px] font-semibold text-ink-2"
        }
      >
        {initials}
      </span>

      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-ink">{title ?? name}</p>
        <p className="text-[13px] text-ink-2">{detail}</p>
      </div>
    </div>
  );
}
