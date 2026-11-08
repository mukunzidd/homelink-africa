"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { AppNotification, NotificationCategory } from "@/lib/domain/types";
import { Link, useRouter } from "@/i18n/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { groupByDay } from "@/lib/notifications/group";
import { markAllNotificationsRead, markNotificationsRead } from "@/app/actions/notifications";
import { BellIcon, CloseIcon } from "@/components/ui/icons";
import { HoverLabel } from "@/components/ui/hover-label";
import { NotificationItem } from "./notification-item";
import { notifyChanged, useUnread } from "./use-unread";
import { useToast } from "./toaster";
import { cn } from "@/lib/cn";

const CATEGORIES: NotificationCategory[] = ["booking", "payment", "message", "stay", "work", "system"];

/**
 * The bell, and the panel it opens.
 *
 * A popover 380px wide on a desktop, a full-width sheet from the top on a
 * phone, where a 380px popover would hang off the edge. Rows are fetched
 * when the panel opens, not with the page: the site header is static, and a
 * bell that made every page read the role cookie would undo that.
 */
export function NotificationBell({ allHref }: { allHref: string }) {
  const t = useTranslations("notifications");
  const { role } = usePreferences();
  const router = useRouter();
  const toast = useToast();
  const signedIn = role !== "visitor";

  const onArrive = useCallback(
    (n: AppNotification) =>
      toast.show({
        title: t(`kinds.${n.kind}.title`, n.params),
        body: t(`kinds.${n.kind}.body`, n.params),
        href: n.href,
        tone: n.kind === "paymentFailed" ? "crit" : "info",
      }),
    [t, toast],
  );
  const { count } = useUnread(signedIn, onArrive);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<NotificationCategory | "">("");
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const [phone, setPhone] = useState(false);

  // Escape, or a press outside both the bell and the panel. The panel is a
  // portal on a phone (the header's backdrop blur would otherwise clip a
  // fixed sheet to the header), so "inside" has to count it as well.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrap.current?.contains(t) && !sheet.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ limit: "12" });
    if (tab === "unread") q.set("unread", "1");
    if (category) q.set("category", category);
    try {
      const res = await fetch(`/api/notifications?${q}`, { cache: "no-store" });
      const data: { items: AppNotification[] } = await res.json();
      setItems(data.items);
      setNow(new Date());
    } catch {
      setItems([]);
    }
  }, [tab, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void load();
  }, [open, load]);

  // Focus goes back to the bell when the panel closes, wherever it closed from.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!signedIn) return null;

  async function openItem(n: AppNotification) {
    if (!n.readAt) {
      await markNotificationsRead([n.id]);
      notifyChanged();
    }
    setOpen(false);
    router.push(n.href);
  }

  async function markAll() {
    await markAllNotificationsRead();
    notifyChanged();
    void load();
  }

  const groups = items ? groupByDay(items, now) : [];
  const badge = count > 9 ? "9+" : String(count);

  const panel = (
    <div
      ref={sheet}
      role="dialog"
      aria-label={t("title")}
      className={cn(
        "flex flex-col overflow-hidden bg-surface",
        // Phone: a sheet under the bar. Desktop: a popover under the bell.
        "fixed inset-x-0 top-14 bottom-0 z-[55] border-t border-line sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:z-50",
        "sm:max-h-[min(640px,calc(100vh-96px))] sm:w-[400px] sm:rounded-card sm:border sm:shadow-[var(--shadow-pop)]",
        "animate-[rise_160ms_ease-out]",
      )}
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{t("title")}</h2>
        <div className="flex items-center gap-1">
          {count > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="cursor-pointer rounded-ctl px-2 py-1 text-[13px] font-semibold text-brand hover:bg-brand-tint"
            >
              {t("markAll")}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label={t("title")}
            className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 sm:hidden"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex flex-none items-center gap-2 border-b border-line-soft px-4 py-2">
        <div role="tablist" className="flex rounded-ctl bg-surface-2 p-0.5">
          {(["all", "unread"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "cursor-pointer rounded-inner px-3 py-1 text-[13px] font-medium transition-colors",
                tab === k ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink",
              )}
            >
              {t(k)}
              {k === "unread" && count > 0 ? ` · ${count}` : ""}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-3">
          <span className="sr-only">{t("filterLabel")}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NotificationCategory | "")}
            className="h-8 cursor-pointer rounded-ctl border border-line bg-surface px-2 text-[13px] text-ink-2"
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {items === null ? (
          <div className="flex flex-col gap-2 p-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-ctl bg-surface-2" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px] text-ink-3">
            {tab === "unread" ? t("emptyUnread") : t("empty")}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.group} className="flex flex-col">
              <h3 className="px-3 pb-1 pt-2.5 text-[12px] font-medium text-ink-3">{t(`groups.${g.group}`)}</h3>
              {g.items.map((n) => (
                <NotificationItem key={n.id} n={n} now={now} onOpen={openItem} compact />
              ))}
            </section>
          ))
        )}
      </div>

      <Link
        href={allHref}
        onClick={close}
        className="flex-none border-t border-line px-4 py-3 text-center text-[14px] font-semibold text-brand hover:bg-surface-2"
      >
        {t("seeAll")}
      </Link>
    </div>
  );

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("bell", { count })}
        onClick={() => {
          setPhone(window.matchMedia("(max-width: 639px)").matches);
          setOpen((v) => !v);
        }}
        className={cn(
          "group relative grid size-9 cursor-pointer place-items-center rounded-ctl transition-colors",
          open ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <BellIcon size={17} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="tnum absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] font-semibold leading-none text-on-brand ring-2 ring-surface"
          >
            {badge}
          </span>
        )}
        {!open && <HoverLabel>{t("title")}</HoverLabel>}
      </button>
      {open && (phone ? createPortal(panel, document.body) : panel)}
    </div>
  );
}
