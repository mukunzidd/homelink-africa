"use client";

import { useSyncExternalStore, useState } from "react";
import { useTranslations } from "next-intl";
import { BellIcon } from "@/components/ui/icons";

type State = "unsupported" | "default" | "granted" | "denied";

function read(): State {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as State;
}

/**
 * Phone notifications, asked for only when the person presses the button.
 *
 * Nothing on any page calls `requestPermission` on load: a browser prompt
 * that appears before someone knows what it is for gets denied, and a
 * denial is permanent until they dig through site settings. Each outcome
 * gets one sentence, including how to undo a block.
 */
export function PushPrompt() {
  const t = useTranslations("notifications.prefs");
  const initial = useSyncExternalStore(() => () => {}, read, () => "default" as State);
  const [state, setState] = useState<State | null>(null);
  const now = state ?? initial;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-full bg-brand-tint text-brand">
          <BellIcon size={18} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold text-ink">{t("pushTitle")}</h3>
          <p className="max-w-[56ch] text-[13.5px] text-ink-2" aria-live="polite">
            {now === "granted"
              ? t("pushGranted")
              : now === "denied"
                ? t("pushDenied")
                : now === "unsupported"
                  ? t("pushUnsupported")
                  : t("pushBody")}
          </p>
        </div>
      </div>
      {now === "default" && (
        <button
          type="button"
          onClick={async () => setState((await Notification.requestPermission()) as State)}
          className="inline-flex min-h-11 flex-none cursor-pointer items-center justify-center rounded-ctl border border-brand px-4 text-[14px] font-semibold text-brand hover:bg-brand-tint"
        >
          {t("pushButton")}
        </button>
      )}
    </section>
  );
}
