import type { LandingData } from "../data";

/** Candidate home page "concierge": not designed yet. */
export default async function Design({ data }: { locale: string; data: LandingData }) {
  return <div className="mx-auto max-w-[1180px] px-6 py-24 text-ink-3">{data.total}</div>;
}
