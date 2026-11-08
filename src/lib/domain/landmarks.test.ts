import { describe, expect, it } from "vitest";
import { driveMinutes, distanceKm, LANDMARK_POINTS } from "./landmarks";

describe("landmarks", () => {
  it("measures the convention centre to the airport at about 5 km", () => {
    const km = distanceKm(LANDMARK_POINTS.conventionCentre, LANDMARK_POINTS.airport);
    expect(km).toBeGreaterThan(4.5);
    expect(km).toBeLessThan(6);
  });

  it("rounds a longer drive to five minutes and never goes below three", () => {
    expect(driveMinutes(LANDMARK_POINTS.cityCentre, LANDMARK_POINTS.airport) % 5).toBe(0);
    expect(driveMinutes(LANDMARK_POINTS.golf, LANDMARK_POINTS.golf)).toBe(3);
  });
});
