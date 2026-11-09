"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/cn";

/**
 * A short, hand-picked set rather than the whole Unicode list: the people
 * writing here are arranging a stay, a car or a day out, so the travel and
 * food rows earn their place and the flags of 250 countries do not. No
 * dependency: a full picker library would outweigh the rest of the thread
 * screen.
 */
const GROUPS = {
  smileys: "😀 😃 😄 😁 😊 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 😌 🤗 🤔 😅 😂 🤣 😇 🙃 😴 😮 😬 😕 😢 😭 😤 😡 🤒 🤧".split(" "),
  people: "👍 👎 👌 ✌️ 🤞 👏 🙌 🙏 🤝 👋 💪 👀 🫶 ❤️ 🧡 💛 💚 💙 💜 🤍 💯 ✅ ❌ ⚠️ ❓ ❗ 👨‍👩‍👧 🧳 👶 🧒 🧑‍🦽 🐕".split(" "),
  travel: "✈️ 🛬 🚗 🚕 🚙 🛻 🏍️ 🚌 🛣️ ⛽ 🅿️ 🗺️ 📍 🏠 🏡 🏢 🏨 🛏️ 🛁 🚿 🔑 🚪 🌄 ⛰️ 🌋 🦍 🐘 🦒 🌳 🌧️ ☀️ 🌙".split(" "),
  food: "☕ 🍵 🥤 🍺 🍷 🥂 🍳 🥞 🥐 🍞 🥑 🍌 🍍 🥭 🍉 🍲 🍛 🍝 🍕 🍔 🌮 🥗 🍰 🎂 🍫 🍯 🥛 🧃 🍽️ 🛒 🧺 🎉".split(" "),
  objects: "📷 📱 💻 🔌 🔋 💡 📶 🧯 🧰 🔧 🪛 🧹 🧼 🧻 🗑️ 📦 📄 🧾 💳 💵 🕐 📅 ⏰ 🔔 🎁 🎒 ☂️ 🧥 👟 🕶️ 🩺 💊".split(" "),
} as const;
type Group = keyof typeof GROUPS | "recent";

const RECENT_KEY = "homelink.emoji.recent";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
}

export function EmojiPicker({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const t = useTranslations("messaging");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [group, setGroup] = useState<Group>("smileys");
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(wrap, open, close);

  function toggle() {
    if (!open) {
      const r = readRecent();
      setRecent(r);
      setGroup(r.length ? "recent" : "smileys");
    }
    setOpen((v) => !v);
  }

  function pick(e: string) {
    onPick(e);
    const next = [e, ...recent.filter((x) => x !== e)].slice(0, 16);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* a private window keeps no recents; the picker still works */
    }
  }

  const tabs: Group[] = recent.length ? ["recent", ...(Object.keys(GROUPS) as Group[])] : (Object.keys(GROUPS) as Group[]);
  const shown = group === "recent" ? recent : GROUPS[group];
  const tabFace: Record<Group, string> = { recent: "🕐", smileys: "😀", people: "👍", travel: "✈️", food: "☕", objects: "📷" };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("emoji")}
        className={cn(
          "grid size-9 cursor-pointer place-items-center rounded-ctl text-[18px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          open ? "bg-surface-2" : "hover:bg-surface-2",
        )}
      >
        <span aria-hidden="true" className="grayscale-[35%]">🙂</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("emoji")}
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[min(320px,calc(100vw-32px))] rounded-card border border-line bg-surface p-2 shadow-[var(--shadow-pop)] animate-[rise_140ms_ease-out]"
        >
          <div role="tablist" className="mb-1.5 flex gap-0.5 border-b border-line-soft pb-1.5">
            {tabs.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                aria-label={t(`emojiGroups.${g}`)}
                title={t(`emojiGroups.${g}`)}
                onClick={() => setGroup(g)}
                className={cn(
                  "grid size-8 cursor-pointer place-items-center rounded-inner text-[16px]",
                  group === g ? "bg-surface-2" : "opacity-60 hover:opacity-100",
                )}
              >
                {tabFace[g]}
              </button>
            ))}
          </div>
          <p className="px-1 pb-1 text-[12px] font-medium text-ink-3">{t(`emojiGroups.${group}`)}</p>
          <div className="grid grid-cols-8 gap-0.5">
            {shown.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => pick(e)}
                className="grid aspect-square cursor-pointer place-items-center rounded-inner text-[20px] leading-none hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
