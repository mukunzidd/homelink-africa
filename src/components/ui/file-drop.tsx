"use client";

import { useId, useRef, useState } from "react";
import { PaperclipIcon, CloseIcon } from "./icons";
import { cn } from "@/lib/cn";

/**
 * Choose or drop a file: an ID, a licence, a photo of a broken tap.
 *
 * Nothing is uploaded. The file stays in the browser, its name and a
 * preview are shown, and `onFile` gets it; Phase 2 sends it to storage.
 * Type and size are checked here so the message comes before a wasted
 * upload, not after.
 */
export function FileDrop({
  label,
  hint,
  accept = "image/*,application/pdf",
  maxMb = 10,
  value,
  onFile,
  errors,
  capture,
}: {
  label: string;
  hint?: string;
  accept?: string;
  maxMb?: number;
  /** The chosen file's name, when there is one. */
  value?: string;
  onFile: (file: File | null) => void;
  errors: { type: string; size: string; choose: string; drop: string; remove: string };
  capture?: "user" | "environment";
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function take(file: File | undefined) {
    if (!file) return;
    const okType = accept.split(",").some((a) => {
      const t = a.trim();
      return t.endsWith("/*") ? file.type.startsWith(t.slice(0, -1)) : file.type === t;
    });
    if (!okType) return setError(errors.type);
    if (file.size > maxMb * 1024 * 1024) return setError(errors.size);
    setError(null);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    onFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-3 rounded-ctl border border-line bg-surface p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-12 flex-none rounded-inner object-cover" />
          ) : (
            <span className="grid size-12 flex-none place-items-center rounded-inner bg-surface-2 text-ink-3">
              <PaperclipIcon size={18} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{value}</span>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onFile(null);
            }}
            aria-label={errors.remove}
            className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-24 flex-col items-center justify-center gap-1 rounded-ctl border border-dashed px-4 py-5 text-center transition-colors",
            over ? "border-brand bg-brand-tint" : error ? "border-crit" : "border-line bg-surface",
          )}
        >
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="cursor-pointer rounded-ctl text-[14px] font-semibold text-brand hover:text-brand-deep"
          >
            {errors.choose}
          </button>
          <span className="text-[12.5px] text-ink-3">{errors.drop}</span>
        </div>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error ? <span className="text-xs text-crit">{error}</span> : hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </div>
  );
}
