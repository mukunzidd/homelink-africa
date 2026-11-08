"use client";

import type { Experience } from "@/lib/domain/types";
import { FlowShell } from "./flow-shell";
import { PeopleStep } from "./steps/people-step";
import type { FlowText } from "./types";

/** The day-out lane's flow: the shared frame plus the people step. */
export function DayFlow({
  experience,
  init,
  text,
  signInHref,
}: {
  experience: Experience;
  init: { slug: string; start: string; end: string; party: number };
  text: FlowText;
  signInHref: string;
}) {
  return (
    <FlowShell
      flow="experience"
      init={init}
      supply={{ kind: "experience", item: experience }}
      text={text}
      houseRules={experience.rules}
      rulesLane="experience"
      people={{ minAge: experience.minAge, requiresPermit: !!experience.requiresPermit }}
      rails={["card", "mobileMoney"]}
      signInHref={signInHref}
      laneStep={({ step, draft, dispatch, attempted }) =>
        step === "people" ? <PeopleStep draft={draft} dispatch={dispatch} attempted={attempted} experience={experience} /> : null
      }
    />
  );
}
