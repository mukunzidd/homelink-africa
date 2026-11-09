"use server";

import { cookies } from "next/headers";
import type { PlaceTripInput } from "@/lib/repos/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

/** Book a whole trip at once: every part or none, checked on the server. */
export async function placeTrip(input: PlaceTripInput) {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role !== "guest" && role !== "visitor") return { ok: false as const, failed: [] };
  const r = await repos().trips.place(input);
  if (r.ok && role === "visitor") {
    (await cookies()).set(ROLE_COOKIE, "guest", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  }
  return r;
}
