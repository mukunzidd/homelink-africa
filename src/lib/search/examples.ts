/**
 * The example sentences offered in the palette, the hero and the landing
 * showcase, as message keys under `smart`. A plain module rather than an
 * export of the palette: a server component importing a constant from a
 * "use client" file receives a client reference, not the array.
 *
 * The palette picks the set for the lane it was opened from: car sentences on
 * Cars, days out on Experiences. Showing "2-bed in Kimihurura" to someone
 * looking at Land Cruisers taught them nothing about what they could ask.
 */
export const EXAMPLE_KEYS = ["example1", "example2", "example3", "example4"] as const;

export const LANE_EXAMPLE_KEYS = {
  homes: ["example1", "example2", "exampleRent", "exampleBuy"],
  cars: ["example4", "exampleCar1", "exampleCar2"],
  experiences: ["exampleDay1", "exampleDay2", "exampleDay3"],
} as const;
