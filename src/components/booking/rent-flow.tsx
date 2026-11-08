"use client";

import type { Listing } from "@/lib/domain/types";
import { FlowShell } from "./flow-shell";
import { ApplicationStep } from "./steps/application-step";
import { AgreementStep } from "./steps/agreement-step";
import type { FlowText } from "./types";

/** Renting a home long-term: the shared frame plus an application and an agreement. */
export function RentFlow({
  listing,
  init,
  text,
  monthLabel,
  agreement,
  signInHref,
}: {
  listing: Listing;
  init: { slug: string; start: string; end: string; party: number };
  text: FlowText;
  monthLabel: string;
  agreement: { heading: string; clauses: string[]; dateLabel: string };
  signInHref: string;
}) {
  return (
    <FlowShell
      flow="rent"
      init={init}
      supply={{ kind: "stay", item: listing }}
      text={text}
      houseRules={listing.houseRules}
      rulesLane="stay"
      rails={["card", "mobileMoney", "bankTransfer"]}
      signInHref={signInHref}
      laneStep={({ step, draft, dispatch, attempted }) =>
        step === "application" ? (
          <ApplicationStep draft={draft} dispatch={dispatch} attempted={attempted} listing={listing} monthLabel={monthLabel} />
        ) : step === "agreement" ? (
          <AgreementStep draft={draft} dispatch={dispatch} attempted={attempted} {...agreement} />
        ) : null
      }
    />
  );
}
