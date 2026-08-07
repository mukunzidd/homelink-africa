import type { Repositories } from "./types";
import { fixtureRepositories } from "./fixtures";

/**
 * The single swap point.
 *
 * Phase 2 adds `./supabase` exporting a `supabaseRepositories` object that
 * satisfies the same `Repositories` type, and this function chooses between
 * them. Nothing else in the app changes — screens call `repos().stays.list()`
 * and never learn where the rows came from.
 */
export function repos(): Repositories {
  return fixtureRepositories;
}

export type { Repositories } from "./types";
