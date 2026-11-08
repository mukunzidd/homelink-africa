import { getTranslations } from "next-intl/server";
import type { NotificationCategory, NotificationKind, Role } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { ALWAYS_IN_APP, NOTIFICATION_CATALOG, kindsFor } from "@/lib/notifications/catalog";
import { PrefsMatrix } from "./prefs-matrix";
import { PushPrompt } from "./push-prompt";

const ORDER: NotificationCategory[] = ["booking", "payment", "stay", "message", "work", "system"];

/** The settings body shared by the guest's and the workspace's page. */
export async function PrefsPage({ role }: { role: Role }) {
  const t = await getTranslations("notifications.prefs");
  const prefs = await repos().notifications.prefs(role);
  const kinds = kindsFor(role);
  const groups = ORDER.map((category) => ({
    category,
    kinds: kinds.filter((k) => NOTIFICATION_CATALOG[k].category === category) as NotificationKind[],
  })).filter((g) => g.kinds.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[66ch] text-[15px] leading-relaxed text-ink-2">{t("intro")}</p>
      <PushPrompt />
      <PrefsMatrix groups={groups} locked={ALWAYS_IN_APP} initial={prefs} />
    </div>
  );
}
