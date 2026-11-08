"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { DriveMode, Vehicle } from "@/lib/domain/types";
import type { BookingDraft, DraftAction, Pickup } from "@/lib/booking/draft";
import { FLIGHT } from "@/lib/booking/validation";
import { FileDrop } from "@/components/ui/file-drop";
import { CarIcon, PlaneIcon, PinIcon, HouseIcon, UsersIcon } from "@/components/ui/icons";
import { ChoiceCards, Field, StepSection, TextInput } from "../fields";

/**
 * A hire's first question: who drives, then where we meet.
 *
 * Self-drive asks for the licence there and then, because finding out at
 * the airport that a licence is needed is the worst place to find out.
 * The flight number is optional and only checked for shape; with it, the
 * driver tracks a late landing instead of leaving.
 */
export function DriverStep({
  draft,
  dispatch,
  attempted,
  vehicle,
  initialMode,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  attempted: boolean;
  vehicle: Vehicle;
  initialMode: DriveMode;
}) {
  const t = useTranslations("booking.driver");
  const tc = useTranslations("cars");
  const tf = useTranslations("files");

  // The detail page already asked; start from that answer.
  useEffect(() => {
    if (!draft.driveMode) dispatch({ type: "driveMode", value: initialMode });
  }, [draft.driveMode, dispatch, initialMode]);

  const pickup: Pickup = draft.pickup ?? { kind: "airport", detail: "" };
  const setPickup = (p: Partial<Pickup>) => dispatch({ type: "pickup", value: { ...pickup, ...p } });
  const flight = pickup.flight?.trim().toUpperCase() ?? "";
  const flightBad = !!flight && !FLIGHT.test(flight);

  return (
    <div className="flex flex-col gap-5">
      <StepSection title={t("title")}>
        <ChoiceCards
          name={t("title")}
          value={draft.driveMode}
          onChange={(v) => dispatch({ type: "driveMode", value: v })}
          options={vehicle.driveModes.map((m) => ({
            value: m,
            title: tc(m),
            body: m === "withDriver" ? t("withDriverBody") : t("selfDriveBody"),
            icon: m === "withDriver" ? <UsersIcon size={15} /> : <CarIcon size={15} />,
          }))}
        />
        {draft.driveMode === "selfDrive" && (
          <div className="flex flex-col gap-1">
            <FileDrop
              label={t("licence")}
              hint={t("licenceHint")}
              value={draft.licenceFileName}
              onFile={(f) => dispatch({ type: "licence", fileName: f?.name })}
              errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
            />
            {attempted && !draft.licenceFileName && (
              <p className="text-xs text-crit" aria-invalid="true" tabIndex={-1}>
                {t("licenceError")}
              </p>
            )}
            <p className="text-[12px] text-ink-3">{tf("note")}</p>
          </div>
        )}
      </StepSection>

      <StepSection title={t("pickupTitle")}>
        <ChoiceCards
          name={t("pickupTitle")}
          value={pickup.kind}
          columns={3}
          // A flight number only means something at the airport; switching away
          // drops it, or a hidden, half-typed one would block the step.
          onChange={(kind) => dispatch({ type: "pickup", value: { kind, detail: "" } })}
          options={[
            { value: "airport", title: t("airport"), icon: <PlaneIcon size={15} /> },
            { value: "hotel", title: t("hotel"), icon: <HouseIcon size={15} /> },
            { value: "address", title: t("address"), icon: <PinIcon size={15} /> },
          ]}
        />
        {pickup.kind === "airport" ? (
          <Field label={t("flight")} hint={t("flightHint")} error={flightBad && t("flightError")} id="flight">
            {(a) => (
              <TextInput
                {...a}
                invalid={a["aria-invalid"]}
                placeholder="WB464"
                autoCapitalize="characters"
                value={pickup.flight ?? ""}
                onChange={(e) => setPickup({ flight: e.target.value.toUpperCase() })}
                className="font-mono uppercase sm:max-w-48"
              />
            )}
          </Field>
        ) : (
          <Field label={pickup.kind === "hotel" ? t("hotelName") : t("addressDetail")} id="pickup-detail">
            {(a) => <TextInput {...a} value={pickup.detail} onChange={(e) => setPickup({ detail: e.target.value })} />}
          </Field>
        )}
      </StepSection>
    </div>
  );
}
