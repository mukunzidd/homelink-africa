import type { ReactNode } from "react";

/** Long-form text at a reading width: paragraphs, headings and lists spaced for reading, not scanning. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[66ch] flex-col gap-4 text-[16px] leading-[1.7] text-ink-2 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
      {children}
    </div>
  );
}

/** A message body written as paragraphs separated by blank lines. */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
