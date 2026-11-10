"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { MoneyText } from "@/components/ui/money-text";
import { cn } from "@/lib/cn";

export type Lane = "all" | "stays" | "rent" | "buy" | "cars" | "days";

export type BoardRow = {
  key: string;
  lane: Exclude<Lane, "all">;
  name: string;
  where: string;
  inspected: string;
  /** ISO inspection date, for the order only. */
  at: string;
  price: Money;
  unit?: string;
  status: "open" | "last" | "full" | "sale";
  href: string;
  image?: string;
};

type Labels = {
  board: string;
  localTime: string;
  name: string;
  where: string;
  inspected: string;
  price: string;
  status: string;
  open: string;
  last: string;
  full: string;
  sale: string;
  legend: string;
  less: string;
};

/** Lines shown before "Show all": a board is read at a glance, not scrolled. */
const SHOWN = 12;

/*
  The board's own colours. Fixed, not theme tokens: the board is an object on
  the page, black with amber letters in a dark room and a light one alike.
  Amber on #101311 is about 11:1, the dim grey about 5.6:1.
*/
const BOARD = {
  "--b-bg": "#101311",
  "--b-row": "#161a17",
  "--b-line": "rgba(255,255,255,0.08)",
  "--b-amber": "#F2C14E",
  "--b-text": "#E9E6DC",
  "--b-dim": "#8C9188",
  "--b-open": "#7CCB9A",
} as React.CSSProperties;

const STATUS_COLOUR: Record<BoardRow["status"], string> = {
  open: "text-[var(--b-open)]",
  last: "text-[var(--b-amber)]",
  full: "text-[var(--b-dim)]",
  sale: "text-[var(--b-text)]",
};

export function Board({ rows, lanes, labels, more }: { rows: BoardRow[]; lanes: { key: Lane; label: string }[]; labels: Labels; more: Partial<Record<Lane, string>> }) {
  const [lane, setLane] = useState<Lane>("all");
  const [all, setAll] = useState(false);
  // Bumped on every lane change; each line re-letters when it changes.
  const [run, setRun] = useState(0);
  const [peek, setPeek] = useState<{ image: string; x: number; y: number } | null>(null);

  const inLane = lane === "all" ? rows : rows.filter((r) => r.lane === lane);
  const shown = all ? inLane : inLane.slice(0, SHOWN);
  const count = (k: Lane) => (k === "all" ? rows.length : rows.filter((r) => r.lane === k).length);

  return (
    <section style={BOARD} aria-labelledby="board-title" className="relative overflow-hidden rounded-[16px] border border-white/10 bg-[var(--b-bg)] font-mono text-[var(--b-text)] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)]">
      {/* Title bar: the city in flap tiles, and the time there. */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--b-line)] px-4 py-4 sm:px-6">
        <h2 id="board-title" className="flex gap-1" aria-label={labels.board}>
          {labels.board.toUpperCase().split("").map((ch, i) => (
            <span key={i} aria-hidden className="relative grid h-8 w-6 place-items-center rounded-[4px] bg-[var(--b-row)] text-[17px] font-medium text-[var(--b-amber)] sm:h-10 sm:w-8 sm:text-[22px]">
              <Flap text={ch} run={run} delay={i * 40} />
              <span className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
            </span>
          ))}
        </h2>
        <Clock label={labels.localTime} />
      </div>

      {/* Lanes. Buttons, not links: they change what the board shows, not the page. */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--b-line)] px-2 py-2 sm:px-4 [scrollbar-width:none]">
        {lanes.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={lane === l.key}
            onClick={() => {
              setLane(l.key);
              setAll(false);
              setRun((n) => n + 1);
            }}
            className={cn(
              "flex flex-none cursor-pointer items-baseline gap-2 rounded-[8px] px-3 py-2 text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--b-amber)]",
              lane === l.key ? "bg-[var(--b-row)] text-[var(--b-amber)]" : "text-[var(--b-dim)] hover:text-[var(--b-text)]",
            )}
          >
            {l.label}
            <span className="tnum text-[11px] opacity-70">{count(l.key)}</span>
          </button>
        ))}
      </div>

      {/* Column heads, from `md`; a phone reads each line as name, place and price. */}
      <div aria-hidden className="hidden grid-cols-[minmax(0,2.6fr)_minmax(0,1.5fr)_88px_minmax(0,1.3fr)_104px] gap-4 px-6 pb-2 pt-4 text-[11px] text-[var(--b-dim)] md:grid">
        <span>{labels.name}</span>
        <span>{labels.where}</span>
        <span>{labels.inspected}</span>
        <span className="text-right">{labels.price}</span>
        <span className="text-right">{labels.status}</span>
      </div>

      <ul
        onPointerLeave={() => setPeek(null)}
        className="flex flex-col"
      >
        {shown.map((r, i) => (
          <li key={r.key} className="border-t border-[var(--b-line)] first:border-t-0 md:first:border-t">
            <Link
              href={r.href}
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse" || !r.image) return setPeek(null);
                setPeek({ image: r.image, x: e.clientX, y: e.clientY });
              }}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 transition-colors duration-100 hover:bg-[var(--b-row)] focus-visible:bg-[var(--b-row)] focus-visible:outline-none sm:px-6 md:grid-cols-[minmax(0,2.6fr)_minmax(0,1.5fr)_88px_minmax(0,1.3fr)_104px] md:py-2.5"
            >
              <span className="line-clamp-2 text-[14px] text-[var(--b-amber)] md:truncate group-hover:underline group-hover:decoration-[var(--b-amber)]/40 group-hover:underline-offset-4 md:text-[15px]">
                <Flap text={r.name.toUpperCase()} run={run} delay={i * 30} />
              </span>
              <span className="col-start-1 row-start-2 truncate text-[12px] text-[var(--b-dim)] md:col-start-auto md:row-start-auto md:text-[13px] md:text-[var(--b-text)]">
                <Flap text={r.where.toUpperCase()} run={run} delay={i * 30 + 60} />
              </span>
              <span className="tnum hidden text-[13px] text-[var(--b-dim)] md:block">{r.inspected.toUpperCase()}</span>
              <span className="col-start-2 row-span-1 row-start-1 text-right text-[14px] md:col-start-auto md:row-start-auto">
                <MoneyText amount={r.price} rounded className="text-[var(--b-text)]" />
                {r.unit && <span className="text-[12px] text-[var(--b-dim)]"> /{r.unit}</span>}
              </span>
              <span className={cn("col-start-2 row-start-2 text-right text-[11px] md:col-start-auto md:row-start-auto md:text-[13px]", STATUS_COLOUR[r.status])}>
                {labels[r.status].toUpperCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--b-line)] px-4 py-3 text-[12px] text-[var(--b-dim)] sm:px-6">
        <span>{labels.legend}</span>
        {inLane.length > SHOWN && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="cursor-pointer rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--b-amber)] hover:bg-[var(--b-row)] focus-visible:outline-2 focus-visible:outline-[var(--b-amber)]"
          >
            {all ? labels.less : more[lane]}
          </button>
        )}
      </div>

      {/* The photograph of the line under the pointer, beside the pointer.
          Mouse only: on touch the tap opens the line. */}
      {peek && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 hidden h-[150px] w-[220px] overflow-hidden rounded-[10px] border border-white/10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] [@media(hover:hover)]:block"
          style={{
            left: Math.min(peek.x + 24, (typeof window !== "undefined" ? window.innerWidth : 9999) - 240),
            top: peek.y - 75,
          }}
        >
          <Image src={peek.image} alt="" fill sizes="220px" className="object-cover" />
        </div>
      )}
    </section>
  );
}

/** Kigali's time, since the reader may be anywhere. Shown once mounted, so the server never guesses it. */
function Clock({ label }: { label: string }) {
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const time = now
    ? new Intl.DateTimeFormat(INTL_LOCALES[locale as Locale] ?? "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Kigali" }).format(now)
    : "--:--";
  return (
    <span className="flex flex-none items-baseline gap-2 text-[11px] text-[var(--b-dim)] sm:gap-3 sm:text-[12px]">
      {label}
      <span className="tnum text-[18px] text-[var(--b-text)] sm:text-[22px]">{time}</span>
    </span>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Text that re-letters like a split-flap board each time `run` changes: every
 * character spins through letters and settles, left to right. The server and
 * the first render show the text itself, and a reader who asked for less
 * motion only ever sees that.
 */
function Flap({ text, run, delay = 0 }: { text: string; run: number; delay?: number }) {
  // Null whenever the letters are still: the text itself is then shown.
  const [shown, setShown] = useState<string | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = now - start;
      let done = true;
      const next = text
        .split("")
        .map((ch, i) => {
          if (ch === " " || t > i * 18 + 160) return ch;
          done = false;
          return t < 0 && i > 0 ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setShown(done ? null : next);
      if (!done) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame.current);
      setShown(null);
    };
  }, [text, run, delay]);
  return (
    <>
      <span aria-hidden>{shown ?? text}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}
