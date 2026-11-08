"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Tone = "info" | "ok" | "warn" | "crit";
type Toast = { id: number; title: string; body?: string; href?: string; tone: Tone };
type Api = { show(t: { title: string; body?: string; href?: string; tone?: Tone }): void };

const Ctx = createContext<Api>({ show: () => {} });

export function useToast(): Api {
  return useContext(Ctx);
}

const TONE: Record<Tone, string> = {
  info: "bg-brand",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
};

/**
 * Short messages about something that just happened: a notification that
 * arrived, a booking placed, a setting saved.
 *
 * Three at most, six seconds each, paused while the pointer or keyboard
 * focus is on one, so nobody loses a message they were reading. Bottom
 * right on a desktop; bottom centre on a phone, lifted above a partner's
 * tab bar. Announced politely: a toast never interrupts a screen reader
 * mid-sentence.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("workspace");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((all) => all.filter((x) => x.id !== id));
  }, []);

  const arm = useCallback(
    (id: number) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.set(id, window.setTimeout(() => dismiss(id), 6000));
    },
    [dismiss],
  );

  const show = useCallback<Api["show"]>(
    (input) => {
      const id = ++seq.current;
      setToasts((all) => [...all.slice(-2), { id, tone: "info", ...input }]);
      arm(id);
    },
    [arm],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end sm:px-0"
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            role="status"
            onMouseEnter={() => window.clearTimeout(timers.current.get(x.id))}
            onMouseLeave={() => arm(x.id)}
            onFocus={() => window.clearTimeout(timers.current.get(x.id))}
            onBlur={() => arm(x.id)}
            className="pointer-events-auto flex w-full max-w-[380px] items-start gap-3 overflow-hidden rounded-card border border-line bg-surface p-3.5 pl-4 shadow-[var(--shadow-pop)] animate-[rise_200ms_ease-out]"
          >
            <span aria-hidden="true" className={cn("mt-1.5 size-2 flex-none rounded-full", TONE[x.tone])} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {x.href ? (
                <Link href={x.href} onClick={() => dismiss(x.id)} className="text-[14px] font-semibold text-ink hover:text-brand">
                  {x.title}
                </Link>
              ) : (
                <p className="text-[14px] font-semibold text-ink">{x.title}</p>
              )}
              {x.body && <p className="text-[13px] leading-snug text-ink-2">{x.body}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(x.id)}
              aria-label={t("closeMenu")}
              className="grid size-7 flex-none cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
