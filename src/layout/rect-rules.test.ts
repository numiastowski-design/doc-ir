import { describe, expect, it } from "vitest";

import type { Rect } from "./rect";
import {
  RECT_RULES,
  holdsPoint,
  holdsRect,
  rawFromBox,
  rawFromCell,
  rawFromEdges,
  rawFromMinMax,
  rawFromXywh,
  type Degenerate,
  type PointRule,
  type RectRule,
} from "./rect-rules";

const r = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });

const box = (edges: RectRule["edges"], degenerate: Degenerate): RectRule => ({ measure: "box", edges, degenerate });
const centre = (degenerate: Degenerate): RectRule => ({ measure: "centre", edges: "inclusive", degenerate });
const point = (degenerate: Degenerate): PointRule => ({ measure: "point", edges: "inclusive", degenerate });

describe("raw constructors never normalise", () => {
  it("rawFromBox maps x,y,cx,cy to the low corner plus extents", () => {
    expect(rawFromBox({ x: 10, y: 20, cx: 5, cy: 7 })).toEqual(r(10, 20, 15, 27));
  });
  it("rawFromBox keeps a negative extent as x1 < x0", () => {
    expect(rawFromBox({ x: 10, y: 20, cx: -4, cy: -6 })).toEqual(r(10, 20, 6, 14));
  });
  it("rawFromXywh maps x,y,w,h", () => {
    expect(rawFromXywh({ x: -3, y: 2.5, w: 4, h: 0.5 })).toEqual(r(-3, 2.5, 1, 3));
  });
  it("rawFromXywh keeps a negative width and height inverted", () => {
    expect(rawFromXywh({ x: 5, y: 5, w: -2, h: -3 })).toEqual(r(5, 5, 3, 2));
  });
  it("rawFromEdges maps left,bottom to x0,y0 and right,top to x1,y1", () => {
    expect(rawFromEdges({ left: 1, right: 9, bottom: 2, top: 8 })).toEqual(r(1, 2, 9, 8));
  });
  it("rawFromEdges keeps right < left and top < bottom as given", () => {
    expect(rawFromEdges({ left: 9, right: 1, bottom: 8, top: 2 })).toEqual(r(9, 8, 1, 2));
  });
  it("rawFromMinMax maps xMin,yMin to x0,y0 and xMax,yMax to x1,y1", () => {
    expect(rawFromMinMax({ xMin: 1, xMax: 9, yMin: 2, yMax: 8 })).toEqual(r(1, 2, 9, 8));
  });
  it("rawFromMinMax keeps xMax < xMin inverted", () => {
    expect(rawFromMinMax({ xMin: 9, xMax: 1, yMin: 8, yMax: 2 })).toEqual(r(9, 8, 1, 2));
  });
  it("rawFromCell maps xLeft,yBottom to x0,y0 and xRight,yTop to x1,y1", () => {
    expect(rawFromCell({ xLeft: 1, xRight: 9, yBottom: 2, yTop: 8 })).toEqual(r(1, 2, 9, 8));
  });
  it("rawFromCell keeps an inverted cell as given", () => {
    expect(rawFromCell({ xLeft: 9, xRight: 1, yBottom: 8, yTop: 2 })).toEqual(r(9, 8, 1, 2));
  });
  it("mixes inversion per axis without touching the other axis", () => {
    expect(rawFromEdges({ left: 9, right: 1, bottom: 2, top: 8 })).toEqual(r(9, 2, 1, 8));
  });
});

describe("box + inclusive", () => {
  const outer = r(0, 0, 10, 10);
  for (const d of ["raw", "normalize"] as const) {
    const rule = box("inclusive", d);
    it(`${d}: strictly inside is contained`, () => {
      expect(holdsRect(rule, outer, r(2, 2, 8, 8))).toBe(true);
    });
    it(`${d}: identical rectangle is contained`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 10, 10))).toBe(true);
    });
    it(`${d}: shared edges are contained`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 5, 5))).toBe(true);
      expect(holdsRect(rule, outer, r(5, 5, 10, 10))).toBe(true);
    });
    it(`${d}: overshoot by one on each side is rejected`, () => {
      expect(holdsRect(rule, outer, r(-1, 0, 10, 10))).toBe(false);
      expect(holdsRect(rule, outer, r(0, -1, 10, 10))).toBe(false);
      expect(holdsRect(rule, outer, r(0, 0, 11, 10))).toBe(false);
      expect(holdsRect(rule, outer, r(0, 0, 10, 11))).toBe(false);
    });
    it(`${d}: disjoint is rejected`, () => {
      expect(holdsRect(rule, outer, r(20, 20, 30, 30))).toBe(false);
    });
  }
  it("a zero-area inner on the edge is contained", () => {
    expect(holdsRect(box("inclusive", "raw"), outer, r(10, 10, 10, 10))).toBe(true);
  });
});

describe("box + smaller-on-one-axis", () => {
  const outer = r(0, 0, 10, 10);
  for (const d of ["raw", "normalize"] as const) {
    const rule = box("smaller-on-one-axis", d);
    it(`${d}: smaller on both axes holds`, () => {
      expect(holdsRect(rule, outer, r(2, 2, 8, 8))).toBe(true);
    });
    it(`${d}: same size does not hold`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 10, 10))).toBe(false);
    });
    it(`${d}: narrower only (same height) holds`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 9, 10))).toBe(true);
    });
    it(`${d}: shorter only (same width) holds`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 10, 9))).toBe(true);
    });
    it(`${d}: not contained fails even if smaller`, () => {
      expect(holdsRect(rule, outer, r(5, 5, 12, 8))).toBe(false);
    });
    it(`${d}: same size shifted fails (not contained)`, () => {
      expect(holdsRect(rule, outer, r(1, 0, 11, 10))).toBe(false);
    });
  }
  it("on a degenerate outer, an equal-size inner does not hold", () => {
    expect(holdsRect(box("smaller-on-one-axis", "raw"), r(5, 5, 5, 5), r(5, 5, 5, 5))).toBe(false);
  });
});

describe("box + not-identical", () => {
  const outer = r(0, 0, 10, 10);
  for (const d of ["raw", "normalize"] as const) {
    const rule = box("not-identical", d);
    it(`${d}: identical does not hold`, () => {
      expect(holdsRect(rule, outer, r(0, 0, 10, 10))).toBe(false);
    });
    it(`${d}: one coordinate different holds (each of the four)`, () => {
      expect(holdsRect(rule, outer, r(1, 0, 10, 10))).toBe(true);
      expect(holdsRect(rule, outer, r(0, 1, 10, 10))).toBe(true);
      expect(holdsRect(rule, outer, r(0, 0, 9, 10))).toBe(true);
      expect(holdsRect(rule, outer, r(0, 0, 10, 9))).toBe(true);
    });
    it(`${d}: not contained fails`, () => {
      expect(holdsRect(rule, outer, r(-1, 0, 10, 10))).toBe(false);
      expect(holdsRect(rule, outer, r(0, 0, 10, 11))).toBe(false);
    });
  }
  it("same dimensions but not identical is not contained, so fails", () => {
    expect(holdsRect(box("not-identical", "raw"), outer, r(1, 1, 11, 11))).toBe(false);
  });
  it("differs from smaller-on-one-axis: a rectangle of equal size cannot be inside yet different, so use a zero-size outer", () => {
    // outer is a line; inner a sub-line of equal height and smaller width: both rules hold.
    const line = r(0, 5, 10, 5);
    expect(holdsRect(box("not-identical", "raw"), line, r(0, 5, 4, 5))).toBe(true);
    expect(holdsRect(box("smaller-on-one-axis", "raw"), line, r(0, 5, 4, 5))).toBe(true);
  });
});

describe("measure centre", () => {
  const outer = r(0, 0, 10, 10);
  for (const d of ["raw", "normalize"] as const) {
    const rule = centre(d);
    it(`${d}: centre well inside holds even if the box overshoots`, () => {
      expect(holdsRect(rule, outer, r(-3, -3, 7, 7))).toBe(true);
    });
    it(`${d}: centre exactly on each outer edge holds`, () => {
      expect(holdsRect(rule, outer, r(-1, 4, 1, 6))).toBe(true);
      expect(holdsRect(rule, outer, r(9, 4, 11, 6))).toBe(true);
      expect(holdsRect(rule, outer, r(4, -1, 6, 1))).toBe(true);
      expect(holdsRect(rule, outer, r(4, 9, 6, 11))).toBe(true);
    });
    it(`${d}: centre half a unit beyond an edge is rejected`, () => {
      expect(holdsRect(rule, outer, r(-2, 4, 1, 6))).toBe(false); // centre x = -0.5
      expect(holdsRect(rule, outer, r(10, 4, 11, 6))).toBe(false); // centre x = 10.5
      expect(holdsRect(rule, outer, r(4, -2, 6, 1))).toBe(false); // centre y = -0.5
      expect(holdsRect(rule, outer, r(4, 10, 6, 11))).toBe(false); // centre y = 10.5
    });
    it(`${d}: half-integer centre inside holds`, () => {
      expect(holdsRect(rule, outer, r(4, 4, 5, 5))).toBe(true); // centre 4.5
      expect(holdsRect(rule, outer, r(0, 0, 1, 1))).toBe(true); // centre 0.5
      expect(holdsRect(rule, outer, r(9, 9, 10, 10))).toBe(true); // centre 9.5
    });
    it(`${d}: a box whose edges equal the outer edges has its centre inside`, () => {
      expect(holdsRect(rule, outer, outer)).toBe(true);
    });
    it(`${d}: a larger inner whose centre is outside is rejected`, () => {
      expect(holdsRect(rule, outer, r(5, 5, 40, 40))).toBe(false);
    });
  }
  it("edges other than inclusive are not applied to the centre measure", () => {
    // identical rectangles: centre is inside, so the rule holds whatever the box-only wording would say
    const weird = { measure: "centre", edges: "not-identical", degenerate: "raw" } as unknown as RectRule;
    expect(holdsRect(weird, outer, outer)).toBe(true);
  });
});

describe("degenerate: normalize and raw give different answers", () => {
  const upright = r(2, 2, 8, 8);
  const flippedOuter = r(10, 10, 0, 0); // same area as r(0,0,10,10), inverted

  it("box inclusive: an inverted outer contains nothing raw, but contains inner when normalised", () => {
    expect(holdsRect(box("inclusive", "raw"), flippedOuter, upright)).toBe(false);
    expect(holdsRect(box("inclusive", "normalize"), flippedOuter, upright)).toBe(true);
  });
  it("box inclusive: an inverted inner that pokes out passes raw but fails normalised", () => {
    const pokes = r(12, 2, 2, 8); // normalised x range 2..12
    expect(holdsRect(box("inclusive", "raw"), r(0, 0, 10, 10), pokes)).toBe(true);
    expect(holdsRect(box("inclusive", "normalize"), r(0, 0, 10, 10), pokes)).toBe(false);
  });
  it("box smaller-on-one-axis: inverted outer", () => {
    expect(holdsRect(box("smaller-on-one-axis", "raw"), flippedOuter, upright)).toBe(false);
    expect(holdsRect(box("smaller-on-one-axis", "normalize"), flippedOuter, upright)).toBe(true);
  });
  it("box smaller-on-one-axis: a fully inverted inner looks smaller raw (negative width) but equals the outer normalised", () => {
    const inner = r(10, 0, 0, 10);
    expect(holdsRect(box("smaller-on-one-axis", "raw"), r(0, 0, 10, 10), inner)).toBe(true);
    expect(holdsRect(box("smaller-on-one-axis", "normalize"), r(0, 0, 10, 10), inner)).toBe(false);
  });
  it("box not-identical: a flipped copy is different raw, identical normalised", () => {
    const flipped = r(10, 0, 0, 10);
    expect(holdsRect(box("not-identical", "raw"), r(0, 0, 10, 10), flipped)).toBe(true);
    expect(holdsRect(box("not-identical", "normalize"), r(0, 0, 10, 10), flipped)).toBe(false);
  });
  it("box not-identical: inverted outer", () => {
    expect(holdsRect(box("not-identical", "raw"), flippedOuter, upright)).toBe(false);
    expect(holdsRect(box("not-identical", "normalize"), flippedOuter, upright)).toBe(true);
  });
  it("centre: inverted outer", () => {
    const inner = r(4, 4, 6, 6);
    expect(holdsRect(centre("raw"), flippedOuter, inner)).toBe(false);
    expect(holdsRect(centre("normalize"), flippedOuter, inner)).toBe(true);
  });
  it("centre: inverted inner has the same centre in both modes (sum is symmetric)", () => {
    const inner = r(6, 6, 4, 4);
    expect(holdsRect(centre("raw"), r(0, 0, 10, 10), inner)).toBe(true);
    expect(holdsRect(centre("normalize"), r(0, 0, 10, 10), inner)).toBe(true);
  });
  it("normalize on already ordered input changes nothing", () => {
    for (const edges of ["inclusive", "smaller-on-one-axis", "not-identical"] as const) {
      expect(holdsRect(box(edges, "normalize"), r(0, 0, 10, 10), r(1, 1, 9, 9))).toBe(
        holdsRect(box(edges, "raw"), r(0, 0, 10, 10), r(1, 1, 9, 9)),
      );
    }
  });
  it("normalize fixes one axis only when only one axis is inverted", () => {
    expect(holdsRect(box("inclusive", "raw"), r(10, 0, 0, 10), upright)).toBe(false);
    expect(holdsRect(box("inclusive", "normalize"), r(10, 0, 0, 10), upright)).toBe(true);
  });
});

describe("holdsPoint", () => {
  const rect = r(0, 0, 10, 10);
  for (const d of ["raw", "normalize"] as const) {
    const rule = point(d);
    it(`${d}: interior`, () => {
      expect(holdsPoint(rule, rect, 5, 5)).toBe(true);
    });
    it(`${d}: all four corners`, () => {
      expect(holdsPoint(rule, rect, 0, 0)).toBe(true);
      expect(holdsPoint(rule, rect, 10, 0)).toBe(true);
      expect(holdsPoint(rule, rect, 0, 10)).toBe(true);
      expect(holdsPoint(rule, rect, 10, 10)).toBe(true);
    });
    it(`${d}: edge midpoints`, () => {
      expect(holdsPoint(rule, rect, 5, 0)).toBe(true);
      expect(holdsPoint(rule, rect, 0, 5)).toBe(true);
      expect(holdsPoint(rule, rect, 10, 5)).toBe(true);
      expect(holdsPoint(rule, rect, 5, 10)).toBe(true);
    });
    it(`${d}: just outside on each side`, () => {
      expect(holdsPoint(rule, rect, -0.5, 5)).toBe(false);
      expect(holdsPoint(rule, rect, 10.5, 5)).toBe(false);
      expect(holdsPoint(rule, rect, 5, -0.5)).toBe(false);
      expect(holdsPoint(rule, rect, 5, 10.5)).toBe(false);
    });
    it(`${d}: far outside diagonally`, () => {
      expect(holdsPoint(rule, rect, 20, 20)).toBe(false);
    });
  }
  it("inverted rectangle never contains a point in raw mode, even at its own corners", () => {
    const inv = r(10, 10, 0, 0);
    expect(holdsPoint(point("raw"), inv, 5, 5)).toBe(false);
    expect(holdsPoint(point("raw"), inv, 10, 10)).toBe(false);
    expect(holdsPoint(point("raw"), inv, 0, 0)).toBe(false);
  });
  it("inverted rectangle is reordered in normalize mode", () => {
    const inv = r(10, 10, 0, 0);
    expect(holdsPoint(point("normalize"), inv, 5, 5)).toBe(true);
    expect(holdsPoint(point("normalize"), inv, 10, 10)).toBe(true);
    expect(holdsPoint(point("normalize"), inv, 11, 5)).toBe(false);
  });
  it("a rectangle inverted on one axis only: raw false, normalize true", () => {
    const inv = r(0, 10, 10, 0);
    expect(holdsPoint(point("raw"), inv, 5, 5)).toBe(false);
    expect(holdsPoint(point("normalize"), inv, 5, 5)).toBe(true);
  });
  it("a zero-area rectangle contains exactly its own point", () => {
    expect(holdsPoint(point("raw"), r(3, 3, 3, 3), 3, 3)).toBe(true);
    expect(holdsPoint(point("raw"), r(3, 3, 3, 3), 3, 4)).toBe(false);
  });
});

describe("RECT_RULES table", () => {
  const expected = {
    "diagram-frame": { measure: "box", edges: "smaller-on-one-axis", degenerate: "raw" },
    "text-in-shape": { measure: "box", edges: "inclusive", degenerate: "raw" },
    "cell-encloses": { measure: "box", edges: "not-identical", degenerate: "raw" },
    "centre-in-box": { measure: "centre", edges: "inclusive", degenerate: "raw" },
    "grid-claim": { measure: "point", edges: "inclusive", degenerate: "raw" },
  } as const;

  it("has exactly the five expected names (figure-body-line retirée le 05/11/2026 avec le test d'étiquette sur figure)", () => {
    expect(Object.keys(RECT_RULES).sort()).toEqual(Object.keys(expected).sort());
    expect(Object.keys(RECT_RULES)).toHaveLength(5);
  });
  for (const [name, rule] of Object.entries(expected)) {
    it(`${name} has exactly its specified fields`, () => {
      expect((RECT_RULES as Record<string, unknown>)[name]).toStrictEqual(rule);
    });
  }
  it("every rule is raw (no module normalises)", () => {
    for (const rule of Object.values(RECT_RULES)) expect(rule.degenerate).toBe("raw");
  });
  it("the table rules behave as their names say", () => {
    const outer = r(0, 0, 10, 10);
    expect(holdsRect(RECT_RULES["diagram-frame"], outer, outer)).toBe(false);
    expect(holdsRect(RECT_RULES["diagram-frame"], outer, r(0, 0, 9, 10))).toBe(true);
    expect(holdsRect(RECT_RULES["text-in-shape"], outer, outer)).toBe(true);
    expect(holdsRect(RECT_RULES["cell-encloses"], outer, outer)).toBe(false);
    expect(holdsRect(RECT_RULES["cell-encloses"], outer, r(0, 0, 10, 9))).toBe(true);
    expect(holdsRect(RECT_RULES["centre-in-box"], outer, r(-1, 4, 1, 6))).toBe(true);
    expect(holdsPoint(RECT_RULES["grid-claim"], outer, 10, 10)).toBe(true);
    expect(holdsPoint(RECT_RULES["grid-claim"], outer, 10, 11)).toBe(false);
  });
});

describe("typing: point rule goes to holdsPoint, rect rules to holdsRect", () => {
  it("accepts each rule at its own evaluator", () => {
    const a = r(0, 0, 10, 10);
    expect(typeof holdsPoint(RECT_RULES["grid-claim"], a, 1, 1)).toBe("boolean");
    expect(typeof holdsRect(RECT_RULES["diagram-frame"], a, a)).toBe("boolean");
    expect(typeof holdsRect(RECT_RULES["text-in-shape"], a, a)).toBe("boolean");
    expect(typeof holdsRect(RECT_RULES["cell-encloses"], a, a)).toBe("boolean");
    expect(typeof holdsRect(RECT_RULES["centre-in-box"], a, a)).toBe("boolean");
  });
  it("rejects crossed usage at compile time", () => {
    const a = r(0, 0, 10, 10);
    // @ts-expect-error a point rule is not a RectRule
    holdsRect(RECT_RULES["grid-claim"], a, a);
    // @ts-expect-error a rect rule is not a PointRule
    holdsPoint(RECT_RULES["text-in-shape"], a, 1, 1);
    expect(true).toBe(true);
  });
});
