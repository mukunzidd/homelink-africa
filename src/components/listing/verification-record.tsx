import { getLocale, getTranslations } from "next-intl/server";
import type { VerificationRecord as Record } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";

/**
 * What the badge opens.
 *
 * The style guide calls this the one place HomeLink must out-design its
 * references: a checkmark is a claim, evidence is a product. So the inspector
 * is a named person with a date, not "our team" — that difference is the
 * entire argument for the platform.
 *
 * No brand colour appears in here. Marketing colour on a guarantee reads as
 * marketing, which is exactly what would undermine it.
 *
 * The copy is kind-aware because the checks genuinely differ. A car is not
 * inspected for water pressure, and telling someone it was would undo the
 * specificity that makes the record worth reading.
 */
export type VerificationKind = "stay" | "car" | "experience";

export async function VerificationRecordPanel({
  record,
  escrowApplies,
  kind = "stay",
}: {
  record: Record;
  escrowApplies: boolean;
  kind?: VerificationKind;
}) {
  const t = await getTranslations("verification");
  const locale = (await getLocale()) as Locale;
  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale]);

  /** Stay copy is the default; the other kinds override the parts that differ. */
  function body(key: "inspectedBody" | "identityBody" | "photographedBody") {
    if (kind === "stay") return t(`steps.${key}`);
    return t(`kinds.${kind}.${key}`);
  }

  const steps = [
    {
      key: "inspected",
      title: t("steps.inspected"),
      body: body("inspectedBody"),
      show: true,
    },
    {
      key: "photographed",
      title: t("steps.photographed"),
      body: body("photographedBody"),
      show: record.photographedByHomeLink,
    },
    {
      key: "identity",
      title: t("steps.identity"),
      body: body("identityBody"),
      show: record.ownerIdentityConfirmed,
    },
    {
      key: "escrow",
      title: t("steps.escrow"),
      body: t("steps.escrowBody"),
      show: escrowApplies,
    },
  ].filter((s) => s.show);

  return (
    <section
      id="verification"
      aria-labelledby="verification-heading"
      className="rounded-card border border-trust/30 bg-trust-tint/40 p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="verification-heading"
          className="font-display text-2xl font-semibold leading-tight text-ink"
        >
          {t("title")}
        </h2>
        <p className="text-sm font-medium text-trust">
          {t("inspectedBy", { name: record.inspectorName, date: inspectedOn })}
        </p>
      </div>

      <ol className="mt-5 flex flex-col">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="grid grid-cols-[1.75rem_1fr] gap-3.5 border-b border-line-soft py-3.5 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="tnum grid size-7 place-items-center rounded-full border border-trust/45 bg-trust-tint text-xs font-extrabold text-trust"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
              <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
