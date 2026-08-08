"use client";

import { useTranslations } from "next-intl";
import { StepperRow } from "@/components/ui/stepper";

export type Party = { adults: number; children: number; infants: number };

/** Infants do not occupy a bed, so they never count toward capacity filtering. */
export function partySize(party: Party): number {
  return Math.max(1, party.adults + party.children);
}

export function WhoPanel({
  party,
  onChange,
}: {
  party: Party;
  onChange: (next: Party) => void;
}) {
  const t = useTranslations("searchPanel");

  return (
    <div className="flex flex-col divide-y divide-line-soft p-5">
      <StepperRow
        label={t("adults")}
        hint={t("adultsHint")}
        value={party.adults}
        min={1}
        onChange={(adults) => onChange({ ...party, adults })}
      />
      <StepperRow
        label={t("children")}
        hint={t("childrenHint")}
        value={party.children}
        onChange={(children) => onChange({ ...party, children })}
      />
      {/* Counted separately because they change what we tell the host, not
          how many beds are needed. */}
      <StepperRow
        label={t("infants")}
        hint={t("infantsHint")}
        value={party.infants}
        max={5}
        onChange={(infants) => onChange({ ...party, infants })}
      />
    </div>
  );
}
