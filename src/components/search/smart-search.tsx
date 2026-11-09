"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const noopSubscribe = () => () => {};
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { readViewed, type Viewed } from "@/lib/recently-viewed";
import { useSaved } from "@/lib/saved";
import { usePreferences } from "@/lib/preferences/context";
import type { PaletteResponse, PaletteRow } from "@/app/api/search/route";
import type { StaffHit } from "@/lib/workspace/staff-search";
import { formatDate } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SupplyImage } from "@/components/ui/supply-image";
import { MoneyText } from "@/components/ui/money-text";
import {
  ArrowRightIcon,
  CalendarIcon,
  CloseIcon,
  HeartIcon,
  HistoryIcon,
  PinIcon,
  SearchIcon,
  SparkIcon,
} from "@/components/ui/icons";
import { IntentChips } from "./intent-chips";
import { LANE_EXAMPLE_KEYS } from "@/lib/search/examples";
import { HoverLabel } from "@/components/ui/hover-label";
import { cn } from "@/lib/cn";

/**
 * Smart search: one field that takes a sentence.
 *
 * The palette shows its working. Under the field is what the sentence was
 * read as, chip by chip, before a single result — so "2 bed near the
 * convention centre under $150" visibly becomes Kimihurura, 2+ bedrooms and a
 * price ceiling, and anything misread is obvious at a glance rather than
 * buried in why the results look odd.
 *
 * Opened from the header button, from ⌘K / Ctrl K anywhere, from "/" when no
 * field has focus, and from the landing hero.
 */

type Ctx = { open: (prefill?: string) => void };
const SmartSearchContext = createContext<Ctx>({ open: () => {} });
export const useSmartSearch = () => useContext(SmartSearchContext);

const RECENT_KEY = "homelink.recent-searches.v1";

function readRecent(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function remember(q: string) {
  const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}


export function SmartSearchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; prefill: string; nonce: number }>({
    open: false,
    prefill: "",
    nonce: 0,
  });

  const open = useCallback((prefill = "") => {
    setState((s) => ({ open: true, prefill, nonce: s.nonce + 1 }));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setState((s) => (s.open ? { ...s, open: false } : { open: true, prefill: "", nonce: s.nonce + 1 }));
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <SmartSearchContext.Provider value={value}>
      {children}
      {state.open && (
        <Palette
          key={state.nonce}
          prefill={state.prefill}
          onClose={() => setState((s) => ({ ...s, open: false }))}
        />
      )}
    </SmartSearchContext.Provider>
  );
}

type Row =
  | { type: "place"; key: string; href: string; name: string; count: number }
  | { type: "item"; key: string; href: string; row: PaletteRow }
  | { type: "recent"; key: string; query: string }
  | { type: "example"; key: string; query: string }
  | { type: "viewed"; key: string; href: string; item: Viewed }
  | { type: "saved"; key: string; href: string; count: number }
  | { type: "all"; key: string; href: string }
  | { type: "booking"; key: string; href: string; hit: StaffHit };

function useSearch(query: string, currency: string) {
  const [data, setData] = useState<PaletteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    // Short enough to feel instant, long enough not to fire on every key
    // of a fast typist.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&cur=${currency}`,
          { signal: ctrl.signal },
        );
        if (res.ok) setData(await res.json());
      } catch {
        // Aborted by the next keystroke, or offline: keep the last answer.
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, query ? 110 : 0);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, currency]);

  return { data, loading };
}

/**
 * Everything the palette knows, without the dialog around it: the sentence,
 * the answer, the rows and which one is picked. The dialog and the landing
 * hero's inline field both run on it, so a sentence reads and ranks the same
 * wherever it is typed.
 */
function usePalette(prefill: string, onLeave: () => void) {
  const t = useTranslations("smart");
  const router = useRouter();
  const { currency } = usePreferences();
  const [query, setQuery] = useState(prefill);
  // -1 is "the sentence itself": Enter searches everything it describes. A
  // row only takes over once the arrows or the pointer pick one, and any new
  // answer hands control back to the sentence.
  const [picked, setPicked] = useState<{ key: string; index: number }>({ key: "", index: -1 });
  // The dialog only mounts in the browser; the inline field also renders on
  // the server, where there is no storage to read.
  const [recent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  const [viewed] = useState<Viewed[]>(() => (typeof window === "undefined" ? [] : readViewed()));
  const { items: savedItems } = useSaved();
  const pathname = usePathname();
  const lane = pathname.startsWith("/cars") ? "cars" : pathname.startsWith("/experiences") ? "experiences" : "homes";
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  // Submitted before the answer arrived: the field shows it is working.
  const [pending, setPending] = useState(false);

  const trimmed = query.trim();
  const { data, loading } = useSearch(trimmed, currency);
  const fresh = data && data.query === trimmed ? data : null;

  const rows: Row[] = useMemo(() => {
    if (!trimmed) {
      return [
        ...viewed.map((v) => ({ type: "viewed" as const, key: `v-${v.href}`, href: v.href, item: v })),
        ...recent.slice(0, 3).map((q, i) => ({ type: "recent" as const, key: `r${i}`, query: q })),
        ...(savedItems.length ? [{ type: "saved" as const, key: "saved", href: "/saved", count: savedItems.length }] : []),
        ...LANE_EXAMPLE_KEYS[lane].map((k) => ({ type: "example" as const, key: k, query: t(k) })),
      ];
    }
    if (!fresh) return [];
    const out: Row[] = [];
    // The desk looks up bookings far more than it browses homes: theirs first.
    for (const h of fresh.staff ?? []) out.push({ type: "booking", key: `b-${h.reference}`, href: `/manage/bookings/${h.reference}`, hit: h });
    for (const p of fresh.places) {
      if (fresh.intent.lane && fresh.intent.lane !== "stays" && fresh.intent.lane !== "buy") break;
      const base = fresh.intent.lane === "buy" ? "/buy" : "/stays";
      out.push({ type: "place", key: `p-${p.name}`, href: `${base}?neighbourhood=${encodeURIComponent(p.name)}`, name: p.name, count: p.count });
    }
    for (const group of ["stays", "sales", "cars", "experiences", "closest"] as const) {
      for (const r of fresh.groups[group] ?? []) out.push({ type: "item", key: `${group}-${r.id}`, href: r.href, row: r });
    }
    out.push({ type: "all", key: "all", href: fresh.href });
    return out;
  }, [trimmed, fresh, recent, viewed, savedItems.length, lane, t]);

  const answerKey = `${trimmed}|${fresh?.tookMs ?? ""}|${fresh?.engine ?? ""}`;
  const active = picked.key === answerKey ? picked.index : -1;
  const setActive = (next: number | ((i: number) => number)) =>
    setPicked({ key: answerKey, index: typeof next === "function" ? next(active) : next });

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (href: string) => {
      if (trimmed) remember(trimmed);
      onLeave();
      router.push(href);
    },
    [trimmed, onLeave, router],
  );

  /** Search everything the sentence describes, now or as soon as it is read. */
  async function submit() {
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (fresh) return go(fresh.href);
    // Enter came faster than the debounce: ask for this sentence directly
    // rather than waiting on the answer the typing will fetch anyway.
    setPending(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&cur=${currency}`);
      if (res.ok) go(((await res.json()) as PaletteResponse).href);
    } finally {
      setPending(false);
    }
  }

  function choose(row: Row | undefined) {
    if (!row) return submit();
    if (row.type === "recent" || row.type === "example") {
      setQuery(row.query);
      inputRef.current?.focus();
      return;
    }
    go(row.href);
  }

  /** Arrows and Enter. Escape and Tab belong to whoever holds the field. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Enter on a typed sentence with nothing highlighted means "show me
      // all of it", which is what a search box does.
      if (active >= 0) choose(rows[active]);
      else submit();
    }
  }

  return { t, query, setQuery, trimmed, fresh, loading: loading || pending, rows, active, setActive, choose, submit, onKeyDown, inputRef, listRef, listId, lane };
}

type PaletteModel = ReturnType<typeof usePalette>;

/** What the sentence was read as, then the rows: shared by both shells. */
function PaletteResults({ m }: { m: PaletteModel }) {
  const { t, fresh, trimmed, rows, active, setActive, choose, listRef, listId } = m;
  const locale = useLocale();

  const groupLabel: Record<PaletteRow["kind"], string> = {
    stay: t("groupStays"),
    sale: t("groupSales"),
    car: t("groupCars"),
    experience: t("groupExperiences"),
  };

  const totalHits = fresh
    ? fresh.groups.stays.length + fresh.groups.sales.length + fresh.groups.cars.length + fresh.groups.experiences.length + (fresh.staff?.length ?? 0)
    : 0;

  // A group's heading shows above its first row only.
  const headings = rows.map((row) =>
    row.type === "recent"
      ? t("recent")
      : row.type === "viewed"
        ? t("recentlyViewed")
        : row.type === "saved"
          ? null
          : row.type === "example"
            ? t("tryAsking")
            : row.type === "place"
              ? t("groupPlaces")
              : row.type === "booking"
                ? t("groupBookings")
                : row.type === "item"
                  ? row.key.startsWith("closest-")
                    ? t("closestHeading")
                    : groupLabel[row.row.kind]
                  : null,
  );

  return (
    <>
      {fresh && trimmed && (
        <div className="flex flex-col gap-2 border-b border-line-soft bg-canvas/60 px-4 py-3 sm:px-5">
          <IntentChips intent={fresh.intent} locale={locale} />
          {fresh.relaxed.length > 0 && totalHits > 0 && (
            <p className="text-[13px] text-warn">
              {fresh.relaxed.length === 1 && fresh.relaxed[0] === "text"
                ? t("relaxedText", { text: fresh.intent.text })
                : t("relaxed", { what: fresh.relaxed.map((k) => t(`relax.${k}`)).join(", ") })}
            </p>
          )}
        </div>
      )}

      <div ref={listRef} id={listId} role="listbox" aria-label={t("title")} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2">
        {rows.map((row, index) => {
          const heading = headings[index];
          const showHeading = heading && heading !== headings[index - 1];

          return (
            <div key={row.key}>
              {showHeading && (
                <p className="px-5 pb-1 pt-3 text-[12px] font-medium text-ink-3">
                  {heading}
                </p>
              )}
              <div
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                data-index={index}
                onMouseMove={() => setActive(index)}
                // Keeps focus in the field, so the inline dropdown does not
                // read the click as focus leaving and close under it.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(row)}
                className={cn(
                  "mx-2 flex cursor-pointer items-center gap-3 rounded-ctl px-3 py-2",
                  index === active ? "bg-brand-tint" : "hover:bg-surface-2",
                  row.type === "all" && "mt-1",
                  row.type === "all" && active === -1 && "ring-1 ring-inset ring-brand/30",
                )}
              >
                <RowBody row={row} t={t} active={index === active} fresh={fresh} />
              </div>
            </div>
          );
        })}

        {trimmed && fresh && totalHits === 0 && fresh.places.length === 0 && (
          <div className="order-first px-5 pb-2 pt-4">
            <p className="font-display text-lg font-semibold text-ink">
              {fresh.intent.text ? t("nothingMentions", { text: fresh.intent.text }) : t("nothingTitle")}
            </p>
            <p className="mt-1 max-w-[52ch] text-sm text-ink-2">{t("nothingBody")}</p>
          </div>
        )}
      </div>
    </>
  );
}

function Palette({ prefill, onClose }: { prefill: string; onClose: () => void }) {
  const m = usePalette(prefill, onClose);
  const { t, query, setQuery, trimmed, fresh, loading, rows, active, inputRef, listId, lane } = m;
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const el = inputRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      returnFocus.current?.focus?.();
    };
  }, [inputRef]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog; the list is driven from the field.
      e.preventDefault();
    } else {
      m.onKeyDown(e);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center sm:px-4 sm:pt-[9vh]">
      <button
        type="button"
        aria-label={t("close")}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[3px] animate-[fade_160ms_ease-out]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden bg-surface sm:h-auto sm:max-h-[78vh] sm:max-w-[680px]",
          "sm:rounded-card sm:border sm:border-line shadow-[var(--shadow-pop)] animate-[rise_180ms_cubic-bezier(.2,.8,.2,1)]",
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <SparkIcon size={20} className="text-brand" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lane === "homes" ? t("placeholder") : t(`placeholderLane.${lane}`)}
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
          />
          {loading && trimmed && (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="cursor-pointer rounded-ctl px-1.5 py-1 text-xs font-semibold text-ink-3 hover:text-ink"
            >
              {t("clear")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink sm:hidden"
          >
            <CloseIcon />
          </button>
          <kbd className="hidden rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:block">
            esc
          </kbd>
        </div>

        <PaletteResults m={m} />

        <div className="hidden items-center justify-between gap-4 border-t border-line px-5 py-2.5 text-[12px] text-ink-3 sm:flex">
          <span className="flex items-center gap-3">
            <span><Kbd>↑</Kbd><Kbd>↓</Kbd> {t("hintMove")}</span>
            <span><Kbd>↵</Kbd> {t("hintOpen")}</span>
          </span>
          {fresh && trimmed && (
            <span className="tnum">
              {t("poweredBy", {
                engine: fresh.engine === "meilisearch" ? "Meilisearch" : t("engineLocal"),
                ms: fresh.tookMs,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Smart search as a field on the page rather than a dialog over it: the
 * landing hero has the room, so the sentence, how it was read and what it
 * found all happen in place, under the headline that promised them.
 *
 * Same model as the dialog. It opens on focus, closes on Escape, on a click
 * outside or when focus leaves, and does not trap Tab: it is part of the
 * page, not over it.
 */
// The inline field on the page, if there is one: the landing's example
// sentences fill it in place instead of opening the dialog over it.
let inlineAsk: ((query: string) => void) | null = null;

/** Asks the inline field, if the page has one. False means there was none. */
export function askInline(query: string): boolean {
  if (!inlineAsk) return false;
  inlineAsk(query);
  return true;
}

export function InlineSmartSearch({ cycle }: { cycle: string[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const m = usePalette("", close);
  const { t, query, setQuery, trimmed, loading, rows, active, inputRef, listId, submit } = m;
  const rootRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  // The empty field shows what it accepts, slowly, and stops while someone
  // is in it.
  useEffect(() => {
    if (open || query || !cycle.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % cycle.length), 3800);
    return () => clearInterval(id);
  }, [open, query, cycle.length]);

  useEffect(() => {
    inlineAsk = (q) => {
      setQuery(q);
      setOpen(true);
      inputRef.current?.focus({ preventScroll: true });
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rootRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    };
    return () => {
      inlineAsk = null;
    };
  }, [setQuery, inputRef]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const expanded = open && rows.length > 0;

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-3 rounded-[16px] border border-line bg-surface py-2 pl-4 pr-2 shadow-[0_8px_24px_-16px_rgba(20,24,20,0.35)] transition-[border-color,box-shadow] duration-150 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20"
      >
        <SearchIcon size={18} className="flex-none text-ink-3" />
        <span className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (open) {
                  e.preventDefault();
                  setOpen(false);
                }
                return;
              }
              if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
              m.onKeyDown(e);
            }}
            aria-label={t("title")}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && rows[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11 w-full bg-transparent text-[16px] text-ink outline-none sm:text-[17px]"
          />
          {!query && cycle.length > 0 && (
            <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[16px] text-ink-3 sm:text-[17px]">
              <span key={i} className="truncate animate-[rise_400ms_ease-out]">
                {cycle[i]}
              </span>
            </span>
          )}
        </span>
        {loading && trimmed && (
          <span aria-hidden className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
        )}
        <button
          type="submit"
          aria-label={t("heroButton")}
          className="inline-flex h-11 flex-none cursor-pointer items-center gap-2 rounded-ctl bg-brand px-4 text-[15px] font-medium text-on-brand transition-colors duration-150 hover:bg-brand-deep sm:px-5"
        >
          <span className="hidden sm:inline">{t("heroButton")}</span>
          <ArrowRightIcon />
        </button>
      </form>

      {expanded && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 flex max-h-[min(480px,64vh)] flex-col overflow-hidden rounded-card border border-line bg-surface text-left shadow-[var(--shadow-pop)] animate-[rise_160ms_cubic-bezier(.2,.8,.2,1)]">
          <PaletteResults m={m} />
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-0.5 inline-grid min-w-[18px] place-items-center rounded-chip border border-line bg-surface-2 px-1 font-mono text-[10px] text-ink-2">
      {children}
    </kbd>
  );
}

function RowBody({
  row,
  t,
  active,
  fresh,
}: {
  row: Row;
  t: ReturnType<typeof useTranslations<"smart">>;
  active: boolean;
  fresh: PaletteResponse | null;
}) {
  const tListing = useTranslations("listing");
  const intl = INTL_LOCALES[useLocale() as Locale];

  if (row.type === "recent" || row.type === "example") {
    return (
      <>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-ctl bg-surface-2 text-ink-3">
          {row.type === "recent" ? <HistoryIcon /> : <SparkIcon />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{row.query}</span>
        <ArrowRightIcon className={cn("text-ink-3", !active && "opacity-0")} />
      </>
    );
  }

  if (row.type === "booking") {
    const h = row.hit;
    return (
      <>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-ctl bg-surface-2 text-ink-3">
          <CalendarIcon size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] text-ink">
            <span className="font-mono text-[13.5px] font-semibold">{h.reference}</span> · {h.guest}
          </span>
          <span className="truncate text-[13px] text-ink-3">
            {h.title} · {formatDate(h.start, intl, { day: "numeric", month: "short" })} → {formatDate(h.end, intl, { day: "numeric", month: "short" })}
          </span>
        </span>
        <ArrowRightIcon className={cn("text-ink-3", !active && "opacity-0")} />
      </>
    );
  }

  if (row.type === "viewed") {
    return (
      <>
        <SupplyImage seed={row.item.href} src={row.item.image} alt="" sizes="56px" className="h-9 w-12 flex-none rounded-ctl" />
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{row.item.name}</span>
        <ArrowRightIcon className={cn("text-ink-3", !active && "opacity-0")} />
      </>
    );
  }

  if (row.type === "saved") {
    return (
      <>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-ctl bg-surface-2 text-ink-3">
          <HeartIcon />
        </span>
        <span className="min-w-0 flex-1 text-[15px] text-ink">{t("savedRow", { count: row.count })}</span>
        <ArrowRightIcon className={cn("text-ink-3", !active && "opacity-0")} />
      </>
    );
  }

  if (row.type === "place") {
    return (
      <>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-ctl bg-surface-2 text-brand">
          <PinIcon />
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">{row.name}</span>
        <span className="text-[13px] text-ink-3">{t("placeCount", { count: row.count })}</span>
      </>
    );
  }

  if (row.type === "all") {
    const lane = fresh?.intent.lane ?? "stays";
    return (
      <>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-ctl bg-brand text-on-brand">
          <SearchIcon />
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-brand">{t(`seeAll.${lane}`)}</span>
        <Kbd>↵</Kbd>
      </>
    );
  }

  const r = row.row;
  const facts = r.facts
    .map((f) =>
      f.key === "bedrooms"
        ? tListing("bedrooms", { count: Number(f.value) })
        : f.key === "sleeps"
          ? tListing("sleeps", { count: Number(f.value) })
          : f.key === "seats"
            ? tListing("seatCount", { count: Number(f.value) })
            : f.key === "hours"
              ? tListing("durationHours", { count: Number(f.value) })
              : f.key === "floor"
                ? t("floorArea", { sqm: Number(f.value) })
                : String(f.value),
    )
    .join(" · ");
  const unit = { night: tListing("perNight"), month: tListing("perMonth"), day: tListing("perDay"), person: t("perPerson"), sale: t("askingPrice") }[r.unit];

  return (
    <>
      <SupplyImage seed={r.seed} src={r.image} alt="" sizes="56px" className="h-11 w-14 flex-none rounded-ctl" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-ink">
          {r.name.map((seg, i) =>
            seg.hit ? (
              <mark key={i} className="rounded-chip bg-brand-tint px-px text-brand-deep">{seg.text}</mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </span>
        <span className="truncate text-[13px] text-ink-3">{facts}</span>
      </span>
      <span className="flex flex-none flex-col items-end">
        {r.total ? (
          <>
            <MoneyText amount={r.total.amount} rounded className="text-[14px] font-semibold text-ink" />
            <span className="text-[11px] text-ink-3">
              {r.total.unit === "nights" ? t("forNights", { count: r.total.count }) : t("forDays", { count: r.total.count })}
            </span>
          </>
        ) : (
          <>
            <MoneyText amount={r.price} rounded className="text-[14px] font-semibold text-ink" />
            <span className="text-[11px] text-ink-3">{unit}</span>
          </>
        )}
      </span>
    </>
  );
}

/**
 * The header's door into the palette. A field-shaped button on wide screens,
 * so it reads as "type here"; an icon on narrow ones, where the tabs need the
 * width.
 */
export function SmartSearchTrigger() {
  const t = useTranslations("smart");
  const { open } = useSmartSearch();
  // Read from the platform after hydration; the server renders the Mac hint.
  const mac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );

  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={t("open")}
      aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
      className="group relative grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
    >
      {/* An icon at every width: the bar is for the lanes, and the palette
          it opens is where searching happens. The shortcut is in the name
          it shows on hover. */}
      <SearchIcon size={17} />
      <HoverLabel>
        {t("triggerShort")} · {mac ? "⌘K" : "Ctrl K"}
      </HoverLabel>
    </button>
  );
}
