"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { Link } from "@/i18n/navigation";
import { useSaved, type SavedKind } from "@/lib/saved";
import { SupplyImage } from "@/components/ui/supply-image";
import { MoneyText } from "@/components/ui/money-text";
import { SaveButton } from "@/components/ui/save-button";
import { CloseIcon, ColumnsIcon, HeartIcon, NoteIcon, SparkIcon } from "@/components/ui/icons";
import { useSmartSearch } from "@/components/search/smart-search";
import { cn } from "@/lib/cn";

export type SavedCatalogueItem = {
  id: string;
  kind: SavedKind;
  href: string;
  name: string;
  line: string;
  price: Money;
  unit: string;
  image?: string;
  seed: string;
  /** For homes: the facts a comparison lines up, already formatted. */
  compare?: { neighbourhood: string; bedrooms: string; size: string; inspected: string; toCentre: string; toAirport: string };
};

/* Notes live beside saved items on the device until accounts arrive. */
const NOTES_KEY = "homelink.saved-notes.v1";
const NOTES_EVENT = "homelink:notes";
function readNotesRaw(): string {
  try {
    return window.localStorage.getItem(NOTES_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
function subscribeNotes(cb: () => void) {
  window.addEventListener(NOTES_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(NOTES_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function useNotes() {
  const raw = useSyncExternalStore(subscribeNotes, readNotesRaw, () => "{}");
  let notes: Record<string, string> = {};
  try {
    notes = JSON.parse(raw);
  } catch {}
  const setNote = (id: string, text: string) => {
    const next = { ...notes, [id]: text };
    if (!text.trim()) delete next[id];
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTES_EVENT));
  };
  return { notes, setNote };
}

const TAB_ORDER: SavedKind[] = ["stay", "sale", "car", "experience"];

/**
 * Saved, grouped by what it is, with a note on each and a comparison for
 * homes.
 *
 * Buyers and long-stay renters always end up comparing two or three places,
 * usually in a spreadsheet: price, bedrooms, how far from work, how recently
 * someone checked it. The comparison lines up exactly those, from the same
 * records as the pages. A note per place is the other half of a shortlist:
 * "ask about the generator", "the one with the avocado tree".
 *
 * The server sends the whole (small) catalogue and the device decides which
 * of it is saved. That is only reasonable while the catalogue is fixtures;
 * when saved places move onto the account the server sends just those.
 */
export function SavedList({ catalogue }: { catalogue: SavedCatalogueItem[] }) {
  const t = useTranslations("saved");
  const tList = useTranslations("list");
  const { items } = useSaved();
  const { open } = useSmartSearch();
  const { notes, setNote } = useNotes();
  const [tab, setTab] = useState<SavedKind | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const saved = items.map((i) => byId.get(i.id)).filter((x): x is SavedCatalogueItem => !!x);
  const kinds = TAB_ORDER.filter((k) => saved.some((s) => s.kind === k));
  const shown = tab === "all" ? saved : saved.filter((s) => s.kind === tab);
  const chosen = picked.map((id) => byId.get(id)).filter((x): x is SavedCatalogueItem => !!x && saved.includes(x));

  useEffect(() => {
    if (!comparing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setComparing(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comparing]);

  if (!saved.length) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-2">
          <HeartIcon size={22} />
        </span>
        <h2 className="font-display text-2xl font-semibold text-ink">{t("emptyTitle")}</h2>
        <p className="max-w-[52ch] text-[15px] text-ink-2">{t("emptyBody")}</p>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/stays", label: tList("emptyStay") },
            { href: "/stays?band=long", label: tList("emptyRent") },
            { href: "/buy", label: tList("emptyBuy") },
            { href: "/cars", label: tList("emptyCars") },
            { href: "/experiences", label: tList("emptyDays") },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center rounded-ctl border border-line bg-surface px-4 text-[14px] font-medium text-ink hover:bg-surface-2">
              {l.label}
            </Link>
          ))}
          <button type="button" onClick={() => open()} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface px-4 text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <SparkIcon className="text-brand" />
            {t("ask")}
          </button>
        </div>
      </div>
    );
  }

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("title")} className="flex flex-wrap gap-1 rounded-ctl border border-line bg-surface-2 p-1">
          {(["all", ...kinds] as const).map((k) => {
            const count = k === "all" ? saved.length : saved.filter((s) => s.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-inner px-3 text-[13px] font-medium transition-colors",
                  tab === k ? "bg-surface text-ink shadow-[0_1px_2px_rgba(12,33,25,0.08)]" : "text-ink-2 hover:text-ink",
                )}
              >
                {k === "all" ? tList("savedAll") : t(`kind.${k}`)}
                <span className="tnum font-mono text-[11px] text-ink-3">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-ink-3">{tList("compareHint")}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => {
          const note = notes[item.id];
          const isPicked = picked.includes(item.id);
          return (
            <li key={item.id} className={cn("relative flex flex-col overflow-hidden rounded-card border bg-surface", isPicked ? "border-brand ring-1 ring-brand" : "border-line")}>
              <Link href={item.href} className="block">
                <SupplyImage seed={item.seed} src={item.image} alt="" sizes="(max-width: 640px) 100vw, 33vw" className="h-44" />
              </Link>
              <span className="absolute right-3 top-3 z-10">
                <SaveButton id={item.id} kind={item.kind} name={item.name} />
              </span>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="text-[12px] font-medium text-ink-3">{t(`kind.${item.kind}`)}</p>
                <Link href={item.href} className="text-[16px] font-semibold leading-snug text-ink hover:underline">
                  {item.name}
                </Link>
                <p className="text-[13px] text-ink-2">{item.line}</p>
                <p className="mt-1 flex items-baseline gap-1.5">
                  <MoneyText amount={item.price} rounded className="text-lg font-semibold text-ink" />
                  <span className="text-[13px] text-ink-3">{item.unit}</span>
                </p>

                {editing === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = new FormData(e.currentTarget).get("note");
                      setNote(item.id, typeof text === "string" ? text : "");
                      setEditing(null);
                    }}
                    className="mt-2 flex flex-col gap-2"
                  >
                    <textarea
                      name="note"
                      autoFocus
                      rows={2}
                      defaultValue={note}
                      placeholder={tList("notePlaceholder")}
                      aria-label={tList("noteLabel")}
                      className="resize-none rounded-ctl border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="min-h-8 cursor-pointer rounded-ctl bg-brand px-3 text-[13px] font-semibold text-on-brand hover:bg-brand-deep">{tList("noteSave")}</button>
                      <button type="button" onClick={() => setEditing(null)} className="min-h-8 cursor-pointer rounded-ctl px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2">{tList("noteCancel")}</button>
                    </div>
                  </form>
                ) : note ? (
                  <button type="button" onClick={() => setEditing(item.id)} className="mt-2 flex cursor-pointer items-start gap-2 rounded-ctl bg-warn-tint/60 px-3 py-2 text-left text-[13px] text-ink">
                    <NoteIcon size={14} className="mt-0.5 text-ink-3" />
                    <span className="line-clamp-3">{note}</span>
                  </button>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
                  {editing !== item.id && !note && (
                    <button type="button" onClick={() => setEditing(item.id)} className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
                      <NoteIcon size={14} />
                      {tList("noteAdd")}
                    </button>
                  )}
                  {item.compare && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
                      <input
                        type="checkbox"
                        checked={isPicked}
                        disabled={!isPicked && picked.length >= 3}
                        onChange={() => togglePick(item.id)}
                        className="size-4 cursor-pointer accent-[var(--brand)]"
                      />
                      {tList("compareThis")}
                    </label>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {chosen.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-5 pr-2 shadow-[var(--shadow-pop)]">
          <span className="text-[14px] text-ink-2">{tList("comparePicked", { count: chosen.length })}</span>
          <button
            type="button"
            disabled={chosen.length < 2}
            onClick={() => setComparing(true)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ColumnsIcon size={15} />
            {tList("compareOpen")}
          </button>
        </div>
      )}

      {comparing && chosen.length >= 2 && (
        <section aria-label={tList("compareTitle")} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">{tList("compareTitle")}</h2>
            <button type="button" onClick={() => setComparing(false)} aria-label={tList("compareClose")} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2">
              <CloseIcon />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="w-40" />
                  {chosen.map((c) => (
                    <th key={c.id} className="px-3 pb-3 text-left align-bottom font-semibold text-ink">
                      <SupplyImage seed={c.seed} src={c.image} alt="" sizes="200px" className="mb-2 h-24 w-full rounded-ctl" />
                      <Link href={c.href} className="hover:underline">{c.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label={tList("compare.price")} cells={chosen.map((c) => (<><MoneyText amount={c.price} rounded className="font-semibold text-ink" /> <span className="text-ink-3">{c.unit}</span></>))} />
                <CompareRow label={tList("compare.neighbourhood")} cells={chosen.map((c) => c.compare?.neighbourhood)} />
                <CompareRow label={tList("compare.bedrooms")} cells={chosen.map((c) => c.compare?.bedrooms)} />
                <CompareRow label={tList("compare.size")} cells={chosen.map((c) => c.compare?.size)} />
                <CompareRow label={tList("compare.toCentre")} cells={chosen.map((c) => c.compare?.toCentre)} />
                <CompareRow label={tList("compare.toAirport")} cells={chosen.map((c) => c.compare?.toAirport)} />
                <CompareRow label={tList("compare.inspected")} cells={chosen.map((c) => c.compare?.inspected)} />
                <CompareRow label={tList("compare.note")} cells={chosen.map((c) => notes[c.id] ?? "")} />
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function CompareRow({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr className="border-t border-line-soft">
      <th scope="row" className="py-2.5 pr-3 text-left text-[13px] font-medium text-ink-3">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="tnum px-3 py-2.5 align-top text-ink-2">{c || "–"}</td>
      ))}
    </tr>
  );
}
