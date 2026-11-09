"use client";

import type { DriveMode, Vehicle } from "@/lib/domain/types";
import { FlowShell } from "./flow-shell";
import { DriverStep } from "./steps/driver-step";
import type { FlowText } from "./types";

/**
 * The car lane's flow: the shared frame plus the driver step. A client
 * wrapper because the lane step is a render function, which cannot cross
 * from a server page.
 */
export function CarFlow({
  vehicle,
  initialMode,
  init,
  text,
  signInHref,
}: {
  vehicle: Vehicle;
  initialMode: DriveMode;
  init: { slug: string; start: string; end: string; party: number };
  text: FlowText;
  signInHref: string;
}) {
  return (
    <FlowShell
      flow="car"
      init={init}
      supply={{ kind: "car", item: vehicle }}
      text={text}
      houseRules={vehicle.rules}
      rulesLane="car"
      rails={["card", "mobileMoney"]}
      signInHref={signInHref}
      laneStep={({ step, draft, dispatch, attempted }) =>
        step === "driver" ? (
          <DriverStep draft={draft} dispatch={dispatch} attempted={attempted} vehicle={vehicle} initialMode={initialMode} />
        ) : null
      }
    />
  );
}
