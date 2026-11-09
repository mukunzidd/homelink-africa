"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Channel, NotificationCategory, NotificationKind, NotificationPrefs } from "@/lib/domain/types";
import { saveNotificationPrefs } from "@/app/actions/notifications";
import { CheckIcon, ShieldIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { useToast } from "./toaster";
import { cn } from "@/lib/cn";

const CHANNELS: Channel[] = ["inApp", "email", "sms", "whatsapp", "push"];

/** Kigali half-hours, for the quiet-hours selects. */
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/**
 * Events down, channels across, one tick each.
 *
 * A grid because the question people actually have is "what reaches me
 * where", and a list of toggles per event hides the pattern. On a phone the
 * grid becomes one card per event with five toggles, since five columns of
 * checkboxes do not fit beside a label at 390px.
 *
 * Three kinds keep in-app locked on, with the reason said beside them: a
 * failed payment, a Mobile Money prompt and check-in details all need the
 * person to do something, and switching off the copy in the app is how
 * someone ends up at a locked door.
 */
export function PrefsMatrix({
  groups,
  locked,
  initial,
}: {
  groups: { category: NotificationCategory; kinds: NotificationKind[] }[];
  locked: NotificationKind[];
  initial: NotificationPrefs;
}) {
  const t = useTranslations("notifications");
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial);

  const has = (k: NotificationKind, c: Channel) => (prefs.channels[k] ?? []).includes(c);
  const isLocked = (k: NotificationKind, c: Channel) => c === "inApp" && locked.includes(k);
  const toggle = (k: NotificationKind, c: Channel) => {
    if (isLocked(k, c)) return;
    setPrefs((p) => {
      const cur = p.channels[k] ?? [];
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
      return { ...p, channels: { ...p.channels, [k]: next } };
    });
  };

  async function save() {
    setSaving(true);
    await saveNotificationPrefs(prefs);
    setSaving(false);
    toast.show({ title: t("prefs.saved"), tone: "ok" });
  }

  const box = (k: NotificationKind, c: Channel) => {
    const on = has(k, c) || isLocked(k, c);
    const label = t("prefs.cellLabel", {
      channel: t(`prefs.channels.${c}`),
      kind: t(`categoriesKinds.${k}`),
    });
    return (
      <label
        className={cn(
          "relative grid size-11 place-items-center rounded-ctl",
          isLocked(k, c) ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-2",
        )}
      >
        <input
          type="checkbox"
          checked={on}
          disabled={isLocked(k, c)}
          onChange={() => toggle(k, c)}
          aria-label={label}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "grid size-5 place-items-center rounded-[5px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
            on ? "border-brand bg-brand text-on-brand" : "border-line bg-surface",
            isLocked(k, c) && "opacity-60",
          )}
        >
          {on && <CheckIcon size={13} />}
        </span>
      </label>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Desktop and tablet: the grid. */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface sm:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 text-[13px] font-medium text-ink-3" />
              {CHANNELS.map((c) => (
                <th key={c} scope="col" className="w-20 px-1 py-3 text-center text-[13px] font-medium text-ink-2">
                  {t(`prefs.channels.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.category} className="border-b border-line-soft last:border-0">
              <tr>
                <th colSpan={6} scope="colgroup" className="bg-surface-2/60 px-5 py-2 text-[12.5px] font-medium text-ink-3">
                  {t(`categories.${g.category}`)}
                </th>
              </tr>
              {g.kinds.map((k) => (
                <tr key={k} className="border-t border-line-soft first:border-0">
                  <th scope="row" className="px-5 py-1.5 text-[14px] font-normal text-ink">
                    <span className="flex flex-col">
                      <KindLabel kind={k} />
                      {locked.includes(k) && (
                        <span className="flex items-center gap-1 text-[12px] text-ink-3">
                          <ShieldIcon size={12} />
                          {t("prefs.locked")}
                        </span>
                      )}
                    </span>
                  </th>
                  {CHANNELS.map((c) => (
                    <td key={c} className="px-1 py-1 text-center">
                      <span className="inline-grid">{box(k, c)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Phone: a card per event. */}
      <div className="flex flex-col gap-5 sm:hidden">
        {groups.map((g) => (
          <section key={g.category} className="flex flex-col gap-2">
            <h3 className="text-[13px] font-medium text-ink-3">{t(`categories.${g.category}`)}</h3>
            {g.kinds.map((k) => (
              <div key={k} className="rounded-card border border-line bg-surface p-4">
                <p className="text-[14px] font-medium text-ink">
                  <KindLabel kind={k} />
                </p>
                {locked.includes(k) && <p className="mt-0.5 text-[12px] text-ink-3">{t("prefs.locked")}</p>}
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {CHANNELS.map((c) => (
                    <div key={c} className="flex flex-col items-center gap-0.5">
                      {box(k, c)}
                      <span className="text-[11px] text-ink-3">{t(`prefs.channels.${c}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-semibold text-ink">{t("prefs.quietTitle")}</h3>
          <p className="max-w-[62ch] text-[13.5px] text-ink-2">{t("prefs.quietBody")}</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={!!prefs.quietHours}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, quietHours: e.target.checked ? { from: "22:00", to: "07:00" } : null }))
            }
            className="size-5 cursor-pointer accent-[var(--brand)]"
          />
          {t("prefs.quietOn")}
        </label>
        {prefs.quietHours && (
          <div className="flex flex-wrap items-end gap-3">
            {(["from", "to"] as const).map((end) => (
              <Select
                key={end}
                label={t(`prefs.${end}`)}
                className="tnum w-32"
                value={prefs.quietHours![end]}
                onChange={(v) => setPrefs((p) => ({ ...p, quietHours: { ...p.quietHours!, [end]: v } }))}
                options={TIMES.map((x) => ({ value: x, label: x }))}
              />
            ))}
            <span className="pb-3 text-[13px] text-ink-3">{t("prefs.kigaliTime")}</span>
          </div>
        )}
      </section>

      {/* At rest the button sits at the end of the page. Only once something
          has changed does it follow the reader down, as a bar with its own
          background, so it never floats over a checkbox nobody has touched. */}
      <div
        className={cn(
          "z-10 flex justify-end",
          dirty && "sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur",
        )}
      >
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-default disabled:opacity-50"
        >
          {saving ? t("prefs.saving") : t("prefs.save")}
        </button>
      </div>
    </div>
  );
}

/** A kind's name for the settings grid: its title, without the specifics. */
function KindLabel({ kind }: { kind: NotificationKind }) {
  const t = useTranslations("notifications");
  return <>{t(`categoriesKinds.${kind}`)}</>;
}
