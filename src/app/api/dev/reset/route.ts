import { NextResponse } from "next/server";
import { resetStore } from "@/lib/repos/fixtures/store";
import { searchChanged } from "@/lib/search";

/**
 * Puts the fixture store back to its seed, so the end-to-end suite starts
 * from the same state every run. Exists only on a dev server started with
 * HOMELINK_E2E=1 (compose sets it for the local container); anywhere else,
 * including every production build, it is a 404.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.HOMELINK_E2E !== "1") return new NextResponse(null, { status: 404 });
  resetStore();
  await searchChanged();
  return NextResponse.json({ ok: true });
}
