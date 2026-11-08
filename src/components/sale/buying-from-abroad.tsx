import { getTranslations } from "next-intl/server";
import { GlobeIcon } from "@/components/ui/icons";

/**
 * Buying from abroad, in five steps.
 *
 * A buyer in Brussels or Houston is probably the most valuable person on the
 * Buy pages and the one with the most unanswered questions: can I view it
 * without flying, who signs for me, how does money move. Each step is a fact
 * about how a purchase works in Rwanda, not a promise of a service we do not
 * run yet.
 */
export async function BuyingFromAbroad({ id }: { id?: string }) {
  const t = await getTranslations("abroad");
  const steps = ["view", "papers", "poa", "money", "notary"] as const;
  return (
    <section id={id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-surface-2 text-ink-2">
          <GlobeIcon size={18} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-semibold text-ink">{t("title")}</h2>
          <p className="max-w-[62ch] text-[14px] text-ink-2">{t("intro")}</p>
        </div>
      </div>
      <ol className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5">
            <span className="tnum text-[12px] font-medium text-ink-3">{t("step", { n: i + 1 })}</span>
            <h3 className="text-[14px] font-semibold text-ink">{t(`${s}Title`)}</h3>
            <p className="text-[13px] leading-relaxed text-ink-2">{t(`${s}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
