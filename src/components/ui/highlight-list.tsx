import type { ReactNode } from "react";

/**
 * Three things worth knowing before reading anything else.
 *
 * The shape is shared by all three lanes; the facts are not. Each lane builds
 * its own candidate list from what is actually true of the item and hands the
 * winners here. That split is the point: a stay, a car and a trek should look
 * like the same product and say different things.
 *
 * Candidates are ordered most-distinguishing first and cut to three. Three is
 * what fits above the fold next to the panel, and a fourth line is where these
 * start turning into a feature list.
 */
export type Highlight = {
  key: string;
  icon: ReactNode;
  title: string;
  body: string;
  /** False drops the candidate. A highlight true of every item is not one. */
  show: boolean;
};

export function pickHighlights(candidates: Highlight[]) {
  return candidates.filter((item) => item.show).slice(0, 3);
}

export function HighlightList({ items }: { items: Highlight[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line-soft">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
        >
          <span className="mt-0.5 flex-none text-ink-2">{item.icon}</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-ink">{item.title}</p>
            <p className="max-w-[58ch] text-sm leading-relaxed text-ink-2">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
