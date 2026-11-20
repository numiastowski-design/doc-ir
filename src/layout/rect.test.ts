import { describe, expect, it } from "vitest";

import { distanceToPoint, fromBox, outlineDistance, type Rect } from "./rect";

const r = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });

describe("constructors", () => {
  it("fromBox reads x, y as the low corner and cx, cy as width and height", () => {
    expect(fromBox({ x: 10, y: 20, cx: 5, cy: 7 })).toEqual(r(10, 20, 15, 27));
  });

  it("fromBox with a zero size gives a degenerate rectangle (x0 === x1)", () => {
    expect(fromBox({ x: 4, y: 4, cx: 0, cy: 3 })).toEqual(r(4, 4, 4, 7));
  });
});

describe("distanceToPoint", () => {
  const box = r(0, 0, 10, 4);

  it("is 0 inside", () => {
    expect(distanceToPoint(box, 5, 2)).toBe(0);
  });

  it("is 0 on an edge and on a corner", () => {
    expect(distanceToPoint(box, 10, 2)).toBe(0);
    expect(distanceToPoint(box, 0, 0)).toBe(0);
    expect(distanceToPoint(box, 10, 4)).toBe(0);
  });

  it("is the axis gap when outside on one axis only", () => {
    expect(distanceToPoint(box, 13, 2)).toBe(3);
    expect(distanceToPoint(box, -2, 2)).toBe(2);
    expect(distanceToPoint(box, 5, 9)).toBe(5);
    expect(distanceToPoint(box, 5, -1.5)).toBe(1.5);
  });

  it("is the Euclidean distance to the nearest corner when outside diagonally", () => {
    expect(distanceToPoint(box, 13, 8)).toBe(5); // gaps 3 and 4
    expect(distanceToPoint(box, -3, -4)).toBe(5);
  });

  it("works for a degenerate rectangle", () => {
    expect(distanceToPoint(r(2, 2, 2, 2), 5, 6)).toBe(5);
    expect(distanceToPoint(r(0, 0, 0, 10), 3, 5)).toBe(3);
    expect(distanceToPoint(r(0, 0, 0, 10), 0, 5)).toBe(0);
  });

  it("works with negative and decimal coordinates", () => {
    expect(distanceToPoint(r(-2.5, -2.5, -0.5, -0.5), 0.5, -0.5)).toBe(1);
  });

  it("is NaN when a coordinate is NaN (documented choice)", () => {
    expect(distanceToPoint(box, Number.NaN, 2)).toBeNaN();
    expect(distanceToPoint(box, 5, Number.NaN)).toBeNaN();
  });

  it("is Infinity for an infinite point against a finite rectangle", () => {
    expect(distanceToPoint(box, Number.POSITIVE_INFINITY, 2)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("outlineDistance", () => {
  const box = r(0, 0, 10, 4);

  it("equals distanceToPoint outside on one axis", () => {
    expect(outlineDistance(box, 13, 2)).toBe(3);
  });

  it("equals distanceToPoint outside diagonally", () => {
    expect(outlineDistance(box, 13, 8)).toBe(5);
  });

  it("is 0 on an edge and on a corner", () => {
    expect(outlineDistance(box, 10, 2)).toBe(0);
    expect(outlineDistance(box, 5, 0)).toBe(0);
    expect(outlineDistance(box, 0, 4)).toBe(0);
  });

  it("is the distance to the nearest edge inside (distanceToPoint would say 0)", () => {
    expect(distanceToPoint(box, 3, 1)).toBe(0);
    expect(outlineDistance(box, 3, 1)).toBe(1); // bottom edge at y 0
    expect(outlineDistance(box, 3, 3.5)).toBe(0.5); // top edge at y 4
    expect(outlineDistance(box, 9, 2)).toBe(1); // right edge at x 10
    expect(outlineDistance(box, 0.25, 2)).toBe(0.25); // left edge at x 0
  });

  it("is the smaller of the four edge gaps at the centre", () => {
    expect(outlineDistance(box, 5, 2)).toBe(2);
  });

  it("works for a degenerate segment and a degenerate point", () => {
    expect(outlineDistance(r(0, 0, 0, 10), 0, 5)).toBe(0);
    expect(outlineDistance(r(0, 0, 0, 10), 3, 5)).toBe(3);
    expect(outlineDistance(r(2, 2, 2, 2), 2, 2)).toBe(0);
    expect(outlineDistance(r(2, 2, 2, 2), 5, 6)).toBe(5);
  });

  it("works with negative and decimal coordinates", () => {
    expect(outlineDistance(r(-10, -10, -2, -4), -3.5, -5)).toBe(1);
  });
});
