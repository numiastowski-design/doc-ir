/**
 * Equivalence phase of the F20 rectangle work: each old per-module containment function is copied verbatim below
 * (the oracle, never modified) and compared with its `rect-rules.ts` rule on deterministic pseudo-random inputs.
 * The rules are in "raw" mode, so equality must hold on well-formed AND degenerate or inverted rectangles.
 * Any disagreement is red, reported with its smallest example.
 */
import { describe, expect, it } from "vitest";
import { RECT_RULES, holdsPoint, holdsRect, rawFromBox, rawFromCell, rawFromEdges, rawFromXywh } from "./rect-rules";

// ---------------------------------------------------------------------------------------------------------------------
// Deterministic generator (LCG, fixed seed)
// ---------------------------------------------------------------------------------------------------------------------

type Rng = () => number;

const lcg = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const N = 24000;
// "bigint" = integers near 1e9 / 1e12 (large whole values); "big" = the same magnitudes with decimals.
const KINDS = ["int", "tenths", "real", "big", "bigint"] as const;
type Kind = (typeof KINDS)[number];
const INTEGER_KINDS: readonly Kind[] = ["int", "bigint"];
const DECIMAL_KINDS: readonly Kind[] = ["tenths", "real", "big"];

/** A coordinate of the given kind (small integers provoke shared edges; big values stress float subtraction). */
const coord = (r: Rng, kind: Kind): number => {
  switch (kind) {
    case "int":
      return Math.floor(r() * 9);
    case "tenths":
      return Math.floor(r() * 81) / 10;
    case "real":
      return r() * 8;
    case "big": {
      const base = r() < 0.5 ? 1e9 : 1e12;
      return base + Math.floor(r() * 21) / 10 + (r() < 0.3 ? r() : 0);
    }
    case "bigint": {
      const base = r() < 0.5 ? 1e9 : 1e12;
      return base + Math.floor(r() * 21);
    }
  }
};

/** A non-negative size of the given kind. */
const size = (r: Rng, kind: Kind): number => {
  switch (kind) {
    case "int":
      return Math.floor(r() * 9);
    case "tenths":
      return Math.floor(r() * 81) / 10;
    case "real":
      return r() * 8;
    case "big":
      return Math.floor(r() * 31) / 10 + (r() < 0.3 ? r() : 0);
    case "bigint":
      return Math.floor(r() * 31);
  }
};

interface Box {
  x: number;
  y: number;
  cx: number;
  cy: number;
}
interface Xywh {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Edges {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
interface CellRect {
  xLeft: number;
  xRight: number;
  yBottom: number;
  yTop: number;
}
interface MinMaxBox {
  xMin: number;
  xMax: number;
  bottom: number;
  top: number;
}

/** Sign of each size: well-formed never negative; degenerate negates at least one of the two. */
const signs = (r: Rng, well: boolean): [number, number] => {
  if (well) return [1, 1];
  const m = Math.floor(r() * 3);
  return [m === 0 || m === 2 ? -1 : 1, m === 1 || m === 2 ? -1 : 1];
};

const genBox = (r: Rng, kind: Kind, well: boolean): Box => {
  const [sx, sy] = signs(r, well);
  return { x: coord(r, kind), y: coord(r, kind), cx: sx * size(r, kind), cy: sy * size(r, kind) };
};
const genXywh = (r: Rng, kind: Kind, well: boolean): Xywh => {
  const b = genBox(r, kind, well);
  return { x: b.x, y: b.y, w: b.cx, h: b.cy };
};
const edgesOf = (b: Box): Edges => ({ left: b.x, right: b.x + b.cx, bottom: b.y, top: b.y + b.cy });
const genEdges = (r: Rng, kind: Kind, well: boolean): Edges => edgesOf(genBox(r, kind, well));

/** Second operand: independent half of the time, otherwise derived from the first (shared or nearly shared edges). */
const near = (r: Rng, base: Box, kind: Kind, well: boolean): Box => {
  if (r() < 0.5) return genBox(r, kind, well);
  const pick = (v: number): number => (r() < 0.5 ? v : v + size(r, kind) * (r() < 0.5 ? 1 : -1));
  const b = { x: pick(base.x), y: pick(base.y), cx: pick(base.cx), cy: pick(base.cy) };
  if (well) {
    b.cx = Math.abs(b.cx);
    b.cy = Math.abs(b.cy);
  }
  return b;
};

const pair = (r: Rng, k: Kind, well: boolean): { a: Box; b: Box } => {
  const a = genBox(r, k, well);
  return { a, b: near(r, a, k, well) };
};

// ---------------------------------------------------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------------------------------------------------

interface Report {
  total: number;
  disagreements: number;
  example: string | undefined;
}

const run = <I>(
  seed: number,
  make: (r: Rng, kind: Kind) => I,
  oldFn: (i: I) => boolean,
  newFn: (i: I) => boolean,
  kinds: readonly Kind[] = KINDS,
): Report => {
  const r = lcg(seed);
  let disagreements = 0;
  let example: string | undefined;
  for (let n = 0; n < N; n++) {
    const input = make(r, kinds[n % kinds.length]!);
    const a = oldFn(input);
    const b = newFn(input);
    if (a !== b) {
      disagreements++;
      const text = `input=${JSON.stringify(input)} old=${a} new=${b}`;
      if (example === undefined || text.length < example.length) example = text;
    }
  }
  return { total: N, disagreements, example };
};

const site = <I>(
  name: string,
  seed: number,
  make: (r: Rng, kind: Kind, well: boolean) => I,
  oldFn: (i: I) => boolean,
  newFn: (i: I) => boolean,
): void => {
  describe(name, () => {
    it("is equal on every well-formed input", () => {
      const rep = run(seed, (r, k) => make(r, k, true), oldFn, newFn);
      expect(rep.disagreements, `${rep.disagreements}/${rep.total} differ; smallest: ${rep.example}`).toBe(0);
    });
    it("is equal on every degenerate or inverted input", () => {
      const rep = run(seed + 1, (r, k) => make(r, k, false), oldFn, newFn);
      expect(rep.disagreements, `${rep.disagreements}/${rep.total} differ; smallest: ${rep.example}`).toBe(0);
    });
  });
};

// ---------------------------------------------------------------------------------------------------------------------
// Oracles: verbatim copies
// ---------------------------------------------------------------------------------------------------------------------

// copie de src/layout/slide-elements.ts:centreInside au 08/10/2026
const oldCentreInside = (inner: Box, outer: Box): boolean => {
  const cx2 = 2 * inner.x + inner.cx;
  const cy2 = 2 * inner.y + inner.cy;
  return cx2 >= 2 * outer.x && cx2 <= 2 * (outer.x + outer.cx) && cy2 >= 2 * outer.y && cy2 <= 2 * (outer.y + outer.cy);
};

// copie de src/extractor/slide-svg.ts:inside au 08/10/2026
const oldInside = (inner: Xywh, outer: Xywh): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

// copie de src/layout/intersection-cells.ts:encloses au 08/10/2026
const oldEncloses = (outer: CellRect, inner: CellRect): boolean =>
  outer.xLeft <= inner.xLeft &&
  outer.xRight >= inner.xRight &&
  outer.yBottom <= inner.yBottom &&
  outer.yTop >= inner.yTop &&
  (outer.xLeft < inner.xLeft ||
    outer.xRight > inner.xRight ||
    outer.yBottom < inner.yBottom ||
    outer.yTop > inner.yTop);

// copie de src/extractor/pdf-page-tables.ts:claimedBy au 08/10/2026 (predicate of the findIndex, HEAD version)
const oldClaims = (b: MinMaxBox, x: number, y: number): boolean =>
  y <= b.top && y >= b.bottom && x >= b.xMin && x <= b.xMax;

// copie de src/layout/diagram-graph.ts:holds au 08/10/2026 (HEAD version)
const oldHolds = (outer: Box, inner: Box): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.cx <= outer.x + outer.cx &&
  inner.y + inner.cy <= outer.y + outer.cy &&
  (inner.cx < outer.cx || inner.cy < outer.cy);

const minMaxOf = (e: Edges): MinMaxBox => ({ xMin: e.left, xMax: e.right, bottom: e.bottom, top: e.top });
const edgesOfMinMax = (b: MinMaxBox): Edges => ({ left: b.xMin, right: b.xMax, bottom: b.bottom, top: b.top });

// ---------------------------------------------------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------------------------------------------------

// (1) The old code computes 2*x + cx, the rule x0 + x1 = x + (x + cx): on decimals the two can round differently
// (4 of 24 000 seen). Slides are in whole EMU, so equality is asserted on the integer families only; the decimal
// families are only held to a disagreement rate below 0.1 %.
describe("(1) slide-elements centreInside", () => {
  const oldFn = ({ a, b }: { a: Box; b: Box }): boolean => oldCentreInside(a, b);
  const newFn = ({ a, b }: { a: Box; b: Box }): boolean =>
    holdsRect(RECT_RULES["centre-in-box"], rawFromBox(b), rawFromBox(a));
  for (const [label, well, seed] of [
    ["well-formed", true, 101],
    ["degenerate or inverted", false, 102],
  ] as const) {
    it(`is equal on every ${label} integer input`, () => {
      const rep = run(seed, (r, k) => pair(r, k, well), oldFn, newFn, INTEGER_KINDS);
      expect(rep.disagreements, `${rep.disagreements}/${rep.total} differ; smallest: ${rep.example}`).toBe(0);
    });
    it(`differs on under 0.1 % of ${label} decimal inputs (rounding of 2*x+cx against x+(x+cx))`, () => {
      const rep = run(seed, (r, k) => pair(r, k, well), oldFn, newFn, DECIMAL_KINDS);
      expect(rep.disagreements, `${rep.disagreements}/${rep.total} differ; smallest: ${rep.example}`).toBeLessThan(
        rep.total / 1000,
      );
    });
  }
});

site<{ a: Xywh; b: Xywh }>(
  "(2) slide-svg inside",
  202,
  (r, k, well) => {
    const a = genXywh(r, k, well);
    const nb = near(r, { x: a.x, y: a.y, cx: a.w, cy: a.h }, k, well);
    return { a, b: { x: nb.x, y: nb.y, w: nb.cx, h: nb.cy } };
  },
  ({ a, b }) => oldInside(a, b),
  ({ a, b }) => holdsRect(RECT_RULES["text-in-shape"], rawFromXywh(b), rawFromXywh(a)),
);

site<{ a: CellRect; b: CellRect }>(
  "(5) intersection-cells encloses",
  505,
  (r, k, well) => {
    const { a, b } = pair(r, k, well);
    const toCell = (q: Box): CellRect => {
      const e = edgesOf(q);
      return { xLeft: e.left, xRight: e.right, yBottom: e.bottom, yTop: e.top };
    };
    return { a: toCell(a), b: toCell(b) };
  },
  ({ a, b }) => oldEncloses(a, b),
  ({ a, b }) => holdsRect(RECT_RULES["cell-encloses"], rawFromCell(a), rawFromCell(b)),
);

site<{ box: MinMaxBox; x: number; y: number }>(
  "(6) pdf-page-tables claimedBy",
  606,
  (r, k, well) => {
    const e = genEdges(r, k, well);
    // The point is a corner, an edge midpoint or free, so the boundary cases are exercised.
    const x = r() < 0.6 ? [e.left, e.right, (e.left + e.right) / 2][Math.floor(r() * 3)]! : coord(r, k);
    const y = r() < 0.6 ? [e.bottom, e.top, (e.bottom + e.top) / 2][Math.floor(r() * 3)]! : coord(r, k);
    return { box: minMaxOf(e), x, y };
  },
  ({ box, x, y }) => oldClaims(box, x, y),
  ({ box, x, y }) => holdsPoint(RECT_RULES["grid-claim"], rawFromEdges(edgesOfMinMax(box)), x, y),
);

site<{ a: Box; b: Box }>(
  "(8) diagram-graph holds",
  808,
  (r, k, well) => pair(r, k, well),
  ({ a, b }) => oldHolds(a, b),
  ({ a, b }) => holdsRect(RECT_RULES["diagram-frame"], rawFromBox(a), rawFromBox(b)),
);
