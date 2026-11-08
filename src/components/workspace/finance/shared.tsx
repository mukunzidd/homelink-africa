import type { ReactNode } from "react";

/** A plain finance table: header row, then rows, scrolling sideways in its own frame on a phone. */
export function FinanceTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[640px] text-[14px]">
        <thead className="border-b border-line bg-surface-2/60 text-left text-[12.5px] text-ink-3">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
export const td = "border-t border-line-soft px-4 py-2.5 align-middle";
