import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Sortable columns become links that set ?sort=key&dir=… in the URL. */
  sortable?: boolean;
  /** Dropped from the table below this width; still shown on the phone card. */
  hideBelow?: "md" | "lg";
  /** The column that names the row; it leads the phone card. */
  primary?: boolean;
};

/**
 * The workspace's table. Server-rendered: sorting is a link, so a sorted
 * view is a URL someone can send. Sticky header; each row can open a
 * record. Below 640px each row becomes a card built from the same columns,
 * because a seven-column table at 390px is a horizontal scroll nobody
 * finds the end of.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  sort,
  sortHref,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  sort?: { key: string; dir: "asc" | "desc" };
  sortHref?: (key: string, dir: "asc" | "desc") => string;
  empty: ReactNode;
  caption?: string;
}) {
  if (!rows.length) return <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center text-[15px] text-ink-3">{empty}</div>;
  const hide = (c: Column<T>) => (c.hideBelow === "lg" ? "hidden lg:table-cell" : c.hideBelow === "md" ? "hidden md:table-cell" : "");
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <>
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface sm:block">
        <table className="w-full border-collapse text-left text-[14px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-14 z-10 bg-surface-2/95 backdrop-blur">
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const nextDir = active && sort?.dir === "asc" ? "desc" : "asc";
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("px-4 py-2.5 text-[12.5px] font-medium text-ink-3", c.align === "right" && "text-right", hide(c))}>
                    {c.sortable && sortHref ? (
                      <Link href={sortHref(c.key, nextDir)} className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}>
                        {c.header}
                        <span aria-hidden="true">{active ? (sort!.dir === "asc" ? "↑" : "↓") : ""}</span>
                      </Link>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="group border-b border-line-soft last:border-0 hover:bg-surface-2/60">
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-ink", c.align === "right" && "text-right", hide(c))}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(r)} className="font-medium text-ink hover:text-brand group-hover:underline">
                        {c.cell(r)}
                      </Link>
                    ) : (
                      c.cell(r)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((r) => {
          const body = (
            <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-4">
              <div className="text-[15px] font-semibold text-ink">{primary.cell(r)}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                {columns
                  .filter((c) => c !== primary)
                  .map((c) => (
                    <div key={c.key} className="flex flex-col">
                      <dt className="text-ink-3">{c.header}</dt>
                      <dd className="text-ink">{c.cell(r)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          );
          return <li key={rowKey(r)}>{rowHref ? <Link href={rowHref(r)}>{body}</Link> : body}</li>;
        })}
      </ul>
    </>
  );
}
