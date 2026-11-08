"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendMessage, markThreadRead } from "@/app/actions/messages";
import { MESSAGE_LIMITS } from "@/lib/repos/types";
import { CloseIcon, PaperclipIcon } from "@/components/ui/icons";
import { EmojiPicker } from "./emoji-picker";
import { cn } from "@/lib/cn";

type Photo = {
  key: string;
  preview: string;
  status: "uploading" | "ready" | "failed";
  id?: string;
  alt: string;
};

const LONG_EDGE = 1600;

/**
 * Re-draws a photo on a canvas, at most 1600px on its long edge, as JPEG.
 *
 * That is what keeps the promise under the box: a canvas carries pixels and
 * nothing else, so the GPS position, the camera and the time the phone wrote
 * into the file are gone before a byte leaves the device. It also turns a
 * 6MB phone photo into a few hundred kilobytes, which matters on a mobile
 * connection outside Kigali.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

const draftKey = (id: string) => `homelink.draft.${id}`;

/**
 * The reply box under a thread: text, emoji, up to four photos.
 *
 * Enter sends and Shift+Enter breaks the line on a keyboard; on a touch
 * screen Enter is a new line and the Send button sends, because a phone
 * keyboard's return key is where people end a sentence, not a message.
 * An unsent reply is kept per thread for the session, so following a link
 * out of the thread and back does not lose it.
 */
export function Composer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("messaging");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // Opening a thread reads it, and restores what was being written there.
  useEffect(() => {
    void markThreadRead(conversationId);
    let saved = "";
    try {
      saved = sessionStorage.getItem(draftKey(conversationId)) ?? "";
    } catch {
      /* no storage in this window: start empty */
    }
    // The composer is keyed by thread, so it starts empty; only a saved
    // draft sets anything. As a transition, because an urgent update here
    // lands while the workspace top bar is still hydrating and forces it to
    // render with the role the browser already knows, which the server's
    // HTML does not have.
    if (saved) startTransition(() => setText(saved));
  }, [conversationId]);

  useEffect(() => {
    try {
      if (text) sessionStorage.setItem(draftKey(conversationId), text);
      else sessionStorage.removeItem(draftKey(conversationId));
    } catch {
      /* drafts are a convenience */
    }
  }, [text, conversationId]);

  // Grows with what is written, up to about eight lines, then scrolls.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  function insert(emoji: string) {
    const el = box.current;
    const at = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? at;
    setText(text.slice(0, at) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + emoji.length, at + emoji.length);
    });
  }

  async function add(files: File[]) {
    setError(null);
    const room = MESSAGE_LIMITS.photos - photos.length;
    if (files.length > room) setError(t("tooMany", { max: MESSAGE_LIMITS.photos }));
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!(MESSAGE_LIMITS.mimes as readonly string[]).includes(file.type)) {
        setError(t("wrongType", { name: file.name }));
        continue;
      }
      if (file.size > MESSAGE_LIMITS.bytes) {
        setError(t("tooBig", { name: file.name }));
        continue;
      }
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      setPhotos((p) => [...p, { key, preview, status: "uploading", alt: "" }]);
      try {
        const blob = await shrink(file);
        const form = new FormData();
        form.set("conversationId", conversationId);
        form.set("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/messages/files", { method: "POST", body: form });
        if (!res.ok) throw new Error(String(res.status));
        const { id } = (await res.json()) as { id: string };
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, status: "ready", id } : x)));
      } catch {
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, status: "failed" } : x)));
      }
    }
  }

  function remove(key: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.key !== key);
    });
  }

  const uploading = photos.some((p) => p.status === "uploading");
  const ready = photos.filter((p) => p.status === "ready");
  const tooLong = text.length > MESSAGE_LIMITS.body;
  const canSend = !busy && !uploading && !tooLong && (text.trim().length > 0 || ready.length > 0);

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const r = await sendMessage(
      conversationId,
      text,
      ready.map((p) => ({ id: p.id!, alt: p.alt })),
    );
    setBusy(false);
    if (!r.ok) {
      setError(r.reason === "tooLong" ? t("tooLong", { max: MESSAGE_LIMITS.body }) : t("sendFailed"));
      return;
    }
    for (const p of photos) URL.revokeObjectURL(p.preview);
    setText("");
    setPhotos([]);
    box.current?.focus();
    window.setTimeout(() => document.getElementById("thread-end")?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
  }

  return (
    <div
      className="relative flex flex-col gap-2 border-t border-line pt-5"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void add([...e.dataTransfer.files]);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 top-3 z-10 grid place-items-center rounded-card border-2 border-dashed border-brand bg-brand-tint/90 text-[14px] font-semibold text-brand-deep">
          {t("dropHere")}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col rounded-ctl border bg-surface transition-colors focus-within:border-brand",
          tooLong ? "border-crit" : "border-line",
        )}
      >
        <label htmlFor={`reply-${conversationId}`} className="sr-only">
          {t("replyLabel")}
        </label>
        <textarea
          ref={box}
          id={`reply-${conversationId}`}
          rows={2}
          value={text}
          placeholder={t("replyPlaceholder")}
          aria-describedby={`reply-hint-${conversationId}`}
          aria-invalid={tooLong || undefined}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
            if (files.length) {
              e.preventDefault();
              void add(files);
            }
          }}
          onKeyDown={(e) => {
            const touch = window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touch) {
              e.preventDefault();
              void send();
            }
          }}
          className="max-h-[220px] min-h-[64px] w-full resize-none rounded-ctl bg-transparent px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
        />

        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-3 px-3 pb-3">
            {photos.map((p, i) => (
              <li key={p.key} className="flex w-[132px] flex-col gap-1.5">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.preview}
                    alt=""
                    className={cn("h-24 w-full rounded-inner border border-line object-cover", p.status !== "ready" && "opacity-50")}
                  />
                  {p.status === "uploading" && (
                    <span className="absolute inset-x-1.5 bottom-1.5 rounded-chip bg-surface/90 px-1.5 py-0.5 text-center text-[11.5px] font-medium text-ink-2">
                      {t("photoUploading")}
                    </span>
                  )}
                  {p.status === "failed" && (
                    <span className="absolute inset-x-1.5 bottom-1.5 rounded-chip bg-crit-tint px-1.5 py-0.5 text-center text-[11.5px] font-medium text-crit">
                      {t("photoFailed")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p.key)}
                    aria-label={t("removePhoto")}
                    className="absolute -right-2 -top-2 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-[var(--shadow-card)] hover:text-ink"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
                <input
                  type="text"
                  value={p.alt}
                  maxLength={200}
                  aria-label={t("photoAltLabel", { n: i + 1 })}
                  placeholder={t("photoAlt")}
                  onChange={(e) => setPhotos((all) => all.map((x) => (x.key === p.key ? { ...x, alt: e.target.value } : x)))}
                  className="h-8 w-full rounded-inner border border-line bg-surface px-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1 border-t border-line-soft px-2 py-1.5">
          <EmojiPicker onPick={insert} disabled={busy} />
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={busy || photos.length >= MESSAGE_LIMITS.photos}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-ctl px-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperclipIcon size={15} />
            <span className="hidden sm:inline">{t("attach")}</span>
            <span className="sr-only sm:hidden">{t("attach")}</span>
          </button>
          <input
            ref={picker}
            type="file"
            accept={MESSAGE_LIMITS.mimes.join(",")}
            multiple
            hidden
            onChange={(e) => {
              void add([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <span id={`reply-hint-${conversationId}`} className="ml-auto hidden text-[12px] text-ink-3 md:inline">
            {t("enterHint")}
          </span>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="ml-auto min-h-9 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3 md:ml-2"
          >
            {busy ? t("sending") : t("send")}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-crit">
          {error}
        </p>
      )}
      <p className="text-[12.5px] text-ink-3">{t("attachLimits")}</p>
    </div>
  );
}
