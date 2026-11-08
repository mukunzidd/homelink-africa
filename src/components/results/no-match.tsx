import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RequestForm } from "@/components/results/request-form";

/**
 * Nothing matched, even after relaxing.
 *
 * "Try fewer words" was a dead end. This says what was missing, offers to tell
 * the person when one is listed (the request lands with the team, in their own
 * words), and still shows the closest homes, because a page with nothing on it
 * gives a visitor nowhere to go but away.
 */
export async function NoMatch({
  title,
  body,
  lane,
  children,
}: {
  title: string;
  body: string;
  lane: string;
  children?: ReactNode;
}) {
  const t = await getTranslations("list");
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <p className="max-w-[60ch] text-[14px] text-ink-2">{body}</p>
        </div>
        <p className="text-[13px] font-medium text-ink">{t("notifyTitle")}</p>
        <RequestForm lane={lane} />
      </section>
      {children && (
        <>
          <h3 className="pt-2 text-[14px] font-semibold text-ink">{t("closestWeHave")}</h3>
          {children}
        </>
      )}
    </div>
  );
}
