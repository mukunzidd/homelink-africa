/**
 * The drawn map of Kigali's hills: a box of the city in SVG units, a linear
 * projection of latitude and longitude into it, and contour lines traced
 * from a few smooth hills by marching squares.
 *
 * The hills are an impression of the city's shape (Mount Kigali in the
 * south-west, Jali to the north-west, Rebero to the south, the ridges of
 * Kacyiru and Nyarutarama), not a survey. They are drawn for the feel of a
 * city of hills; nothing on the page reads a height from them.
 */

/** The map's box: north-west corner and south-east corner, in degrees. */
const NORTH = -1.905;
const SOUTH = -2.01;
const WEST = 30.015;
const EAST = 30.155;

/** SVG units. 10,000 units to a degree both ways, so the city keeps its shape. */
export const MAP_W = 1400;
export const MAP_H = 1050;

export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - WEST) / (EAST - WEST)) * MAP_W,
    y: ((NORTH - lat) / (NORTH - SOUTH)) * MAP_H,
  };
}

/** One kilometre in SVG units at Kigali's latitude, for the scale bar. */
export const KM = (1 / 111.32) * 10000;

type Hill = { lat: number; lng: number; h: number; sx: number; sy: number; turn?: number };

const HILLS: Hill[] = [
  { lat: -1.9796, lng: 30.0306, h: 1, sx: 200, sy: 170 }, // Mount Kigali
  { lat: -1.9, lng: 30.035, h: 0.85, sx: 260, sy: 150 }, // Jali
  { lat: -1.997, lng: 30.076, h: 0.75, sx: 180, sy: 120 }, // Rebero
  { lat: -1.943, lng: 30.09, h: 0.55, sx: 110, sy: 200, turn: 0.35 }, // Kacyiru and Kimihurura
  { lat: -1.928, lng: 30.112, h: 0.5, sx: 170, sy: 110 }, // Nyarutarama and Kibagabaga
  { lat: -1.912, lng: 30.072, h: 0.6, sx: 200, sy: 110 }, // Gisozi and Kagugu
  { lat: -1.952, lng: 30.063, h: 0.45, sx: 90, sy: 80 }, // Kiyovu
  { lat: -1.978, lng: 30.14, h: 0.45, sx: 230, sy: 160 }, // Kanombe
  { lat: -1.975, lng: 30.084, h: 0.3, sx: 120, sy: 90 }, // Gikondo
];

const PEAKS = HILLS.map((hill) => ({ ...project(hill.lat, hill.lng), ...hill }));

function height(x: number, y: number): number {
  let z = 0;
  for (const p of PEAKS) {
    const dx = x - p.x;
    const dy = y - p.y;
    const c = Math.cos(p.turn ?? 0);
    const s = Math.sin(p.turn ?? 0);
    const u = (dx * c + dy * s) / p.sx;
    const v = (-dx * s + dy * c) / p.sy;
    z += p.h * Math.exp(-(u * u + v * v) / 2);
  }
  // A slow ripple so the lines are not drawn with a compass.
  return z + 0.025 * Math.sin(x / 61 + y / 97) + 0.02 * Math.cos(y / 53 - x / 131);
}

const STEP = 14;
const r = (n: number) => Math.round(n * 10) / 10;

/** Contour paths, one per level, with every fourth marked as an index contour. */
export function contours(levels = 12, first = 0.08, gap = 0.08): { d: string; index: boolean }[] {
  const nx = Math.ceil(MAP_W / STEP) + 1;
  const ny = Math.ceil(MAP_H / STEP) + 1;
  const z: number[] = new Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = height(i * STEP, j * STEP);

  const out: { d: string; index: boolean }[] = [];
  for (let k = 0; k < levels; k++) {
    const lv = first + k * gap;
    const parts: string[] = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = z[j * nx + i];
        const b = z[j * nx + i + 1];
        const c = z[(j + 1) * nx + i + 1];
        const d = z[(j + 1) * nx + i];
        const code = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x0 = i * STEP;
        const y0 = j * STEP;
        const t = (p: number, q: number) => (lv - p) / (q - p);
        const top = () => [x0 + t(a, b) * STEP, y0] as const;
        const right = () => [x0 + STEP, y0 + t(b, c) * STEP] as const;
        const bottom = () => [x0 + t(d, c) * STEP, y0 + STEP] as const;
        const left = () => [x0, y0 + t(a, d) * STEP] as const;
        const seg = (p: readonly [number, number], q: readonly [number, number]) =>
          parts.push(`M${r(p[0])} ${r(p[1])}L${r(q[0])} ${r(q[1])}`);
        switch (code) {
          case 1: case 14: seg(left(), bottom()); break;
          case 2: case 13: seg(bottom(), right()); break;
          case 3: case 12: seg(left(), right()); break;
          case 4: case 11: seg(top(), right()); break;
          case 6: case 9: seg(top(), bottom()); break;
          case 7: case 8: seg(left(), top()); break;
          case 5: seg(left(), top()); seg(bottom(), right()); break;
          case 10: seg(top(), right()); seg(left(), bottom()); break;
        }
      }
    }
    if (parts.length) out.push({ d: parts.join(""), index: k % 4 === 3 });
  }
  return out;
}

/**
 * The section divider: a few contour lines across the page that draw
 * together where the slope is steep and apart where it eases, as they do
 * on a hillside. `seed` moves the steep part so no two dividers match.
 */
export function dividerPaths(seed: number, lines = 4, w = 1200, h = 32): string[] {
  const steep = w * (0.25 + 0.5 * ((seed * 0.618) % 1));
  const paths: string[] = [];
  for (let n = 0; n < lines; n++) {
    const pts: string[] = [];
    for (let x = 0; x <= w; x += 10) {
      const near = Math.exp(-(((x - steep) / 220) ** 2));
      const spacing = 7 - 4.5 * near;
      const wave = 3 * Math.sin(x / 140 + seed) + 1.5 * Math.sin(x / 57 + seed * 2);
      const y = h / 2 + (n - (lines - 1) / 2) * spacing + wave;
      pts.push(`${x === 0 ? "M" : "L"}${x} ${r(y)}`);
    }
    paths.push(pts.join(""));
  }
  return paths;
}
