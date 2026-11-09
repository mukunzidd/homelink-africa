import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type Cell = ReactElement<{ children?: ReactNode; "data-label"?: string }>;

/**
 * A plain finance table: header row, then rows. On a phone each row stacks
 * into a card, every cell on its own line with its column name beside it,
 * because a sideways-scrolling table left the amount column off screen.
 * The column names reach the cells as `data-label`, copied here from `head`
 * by position, so the tabs keep writing ordinary rows. The first cell is
 * the card's title and goes unlabelled ("Cars", "Nov 14, 11:30").
 */
export function FinanceTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  const label = (i: number) => (typeof head[i] === "string" ? (head[i] as string) : "");
  const rows = Children.toArray(children).map((row) => {
    if (!isValidElement<{ children?: ReactNode }>(row)) return row;
    const cells = Children.toArray(row.props.children).map((c, i) => (isValidElement(c) ? cloneElement(c as Cell, { "data-label": label(i) }) : c));
    return cloneElement(row, {}, cells);
  });
  return (
    <div className="rounded-card border border-line bg-surface sm:overflow-x-auto">
      <table className="w-full text-[14px] max-sm:block sm:min-w-[640px]">
        <thead className="border-b border-line bg-surface-2/60 text-left text-[12.5px] text-ink-3 max-sm:sr-only">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="max-sm:block max-sm:[&>tr]:block max-sm:[&>tr]:border-t max-sm:[&>tr]:border-line max-sm:[&>tr]:py-2 max-sm:[&>tr:first-child]:border-t-0 max-sm:[&>tr>td:first-child]:justify-start max-sm:[&>tr>td:first-child]:pb-1.5 max-sm:[&>tr>td:first-child]:font-semibold max-sm:[&>tr>td:first-child]:text-ink max-sm:[&>tr>td:first-child]:before:content-none">{rows}</tbody>
      </table>
      {empty}
    </div>
  );
}

/**
 * A finance cell. On a phone it is a line of its own: the column name on
 * the left, the value on the right (empty-named cells, the action buttons,
 * just sit at the right).
 */
export const td =
  "border-t border-line-soft px-4 py-2.5 align-middle max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:border-t-0 max-sm:py-1 max-sm:text-right max-sm:before:text-left max-sm:before:text-[12.5px] max-sm:before:font-normal max-sm:before:text-ink-3 max-sm:before:content-[attr(data-label)]";
