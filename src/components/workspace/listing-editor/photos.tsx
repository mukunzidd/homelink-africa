"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm } from "./editor-form";
import { FileDrop } from "@/components/ui/file-drop";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Order is the whole job here: the first photograph is the one on every
 * card and the top of the page. Drag to reorder, or use the arrow buttons
 * from a keyboard; "Make cover" moves one to the front. A photo added here
 * is shown as a local preview only: uploading to storage is Phase 2, and
 * the page says so rather than pretending it saved.
 */
export function PhotosTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  const tf = useTranslations("files");
  const [local, setLocal] = useState<{ name: string; url: string } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  return (
    <EditorForm<string[]> listingId={listing.id} initial={listing.images ?? []} toPatch={(images) => ({ images })}>
      {(images, set) => {
        const move = (from: number, to: number) => {
          if (to < 0 || to >= images.length) return;
          const next = [...images];
          const [x] = next.splice(from, 1);
          next.splice(to, 0, x);
          set(next);
        };
        return (
          <>
            <p className="text-[14px] text-ink-2">{t("photosHint")}</p>
            {images.length ? (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((src, i) => (
                  <li
                    key={src}
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (drag !== null) move(drag, i);
                      setDrag(null);
                    }}
                    className={cn("group relative flex cursor-grab flex-col overflow-hidden rounded-ctl border bg-surface", i === 0 ? "border-brand ring-1 ring-brand" : "border-line", drag === i && "opacity-50")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-28 w-full object-cover" draggable={false} />
                    <div className="flex items-center gap-1 p-1.5">
                      {i === 0 ? (
                        <span className="px-1.5 text-[12px] font-semibold text-brand">{t("cover")}</span>
                      ) : (
                        <button type="button" onClick={() => move(i, 0)} className="cursor-pointer rounded-inner px-1.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-surface-2">{t("makeCover")}</button>
                      )}
                      <span className="flex-1" />
                      <button type="button" aria-label={t("moveEarlier", { n: i + 1 })} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-7 cursor-pointer place-items-center rounded-inner text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronLeftIcon size={14} /></button>
                      <button type="button" aria-label={t("moveLater", { n: i + 1 })} disabled={i === images.length - 1} onClick={() => move(i, i + 1)} className="grid size-7 cursor-pointer place-items-center rounded-inner text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronRightIcon size={14} /></button>
                      <button type="button" aria-label={t("removePhoto", { n: i + 1 })} onClick={() => set(images.filter((_, j) => j !== i))} className="grid size-7 cursor-pointer place-items-center rounded-inner text-ink-2 hover:bg-crit-tint hover:text-crit"><CloseIcon size={13} /></button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-ctl border border-dashed border-line p-6 text-[14px] text-ink-3">{t("noPhotos")}</p>
            )}
            <div className="flex flex-col gap-2">
              <FileDrop
                label={t("addPhoto")}
                accept="image/*"
                value={local?.name}
                onFile={(f) => setLocal(f ? { name: f.name, url: URL.createObjectURL(f) } : null)}
                errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
              />
              {local && <p className="rounded-ctl bg-warn-tint px-3 py-2 text-[13px] text-warn">{t("phase2Upload")}</p>}
            </div>
          </>
        );
      }}
    </EditorForm>
  );
}
