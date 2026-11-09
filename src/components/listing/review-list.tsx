"use client";

import { useState } from "react";

/** Six at a time; "show more" adds six. */
export function ReviewList({ reviews, more }: { reviews: { id: string; name: string; when: string; text: string }[]; more: string }) {
  const [n, setN] = useState(6);
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {reviews.slice(0, n).map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5">
            <p className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-ink">{r.name}</span>
              <span className="text-[13px] text-ink-3">{r.when}</span>
            </p>
            <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{r.text}</p>
          </li>
        ))}
      </ul>
      {n < reviews.length && (
        <button type="button" onClick={() => setN(n + 6)} className="min-h-10 cursor-pointer self-start rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand">
          {more}
        </button>
      )}
    </div>
  );
}
