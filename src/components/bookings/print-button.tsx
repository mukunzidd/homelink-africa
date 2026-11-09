"use client";

import { NoteIcon } from "@/components/ui/icons";

/** Opens the browser's print dialog, which also offers "Save as PDF". */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
    >
      <NoteIcon size={16} />
      {label}
    </button>
  );
}
