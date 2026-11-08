"use client";

import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm, field } from "./editor-form";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** House rules, in the order a guest needs them. Each is one sentence; guests accept them all at checkout. */
export function RulesTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  return (
    <EditorForm<string[]> listingId={listing.id} initial={listing.houseRules} toPatch={(rules) => ({ houseRules: rules.map((r) => r.trim()).filter(Boolean) })}>
      {(rules, set) => {
        const move = (i: number, to: number) => {
          if (to < 0 || to >= rules.length) return;
          const next = [...rules];
          [next[i], next[to]] = [next[to], next[i]];
          set(next);
        };
        return (
          <>
            <p className="text-[14px] text-ink-2">{t("rulesHint")}</p>
            <ol className="flex flex-col gap-2">
              {rules.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="tnum w-6 text-right text-[13px] text-ink-3">{i + 1}.</span>
                  <input aria-label={t("ruleN", { n: i + 1 })} value={r} maxLength={300} onChange={(e) => set(rules.map((x, j) => (j === i ? e.target.value : x)))} className={cn(field, "flex-1")} />
                  <button type="button" aria-label={t("moveUp", { n: i + 1 })} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronDownIcon size={14} className="rotate-180" /></button>
                  <button type="button" aria-label={t("moveDown", { n: i + 1 })} disabled={i === rules.length - 1} onClick={() => move(i, i + 1)} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronDownIcon size={14} /></button>
                  <button type="button" aria-label={t("removeRule", { n: i + 1 })} onClick={() => set(rules.filter((_, j) => j !== i))} className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-crit-tint hover:text-crit"><CloseIcon size={13} /></button>
                </li>
              ))}
            </ol>
            <button type="button" disabled={rules.length >= 30} onClick={() => set([...rules, ""])} className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-ctl border border-dashed border-line px-4 text-[14px] font-semibold text-ink-2 hover:border-brand hover:text-ink">
              <PlusIcon size={14} />
              {t("addRule")}
            </button>
          </>
        );
      }}
    </EditorForm>
  );
}
