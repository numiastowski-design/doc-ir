/**
 * The values of the base's own bounds, pinned: the default that withholds nothing, the four chart bounds, and the one
 * length client text is cut at in a notice.
 * WHERE THEY COME FROM. Until 19/11/2026 the publisher's app pinned these beside its own caps; a constant of the base
 * that the app does not take is pinned here, with the base.
 * Run: npx vitest run --project=main packages/doc-ir/src/lib/reader-limits.values.test.ts
 */
import { describe, expect, it } from "vitest";

import {
  MAX_CHART_CELLS,
  MAX_CHART_LEVELS,
  MAX_CHART_POINTS,
  MAX_CHART_SERIES,
  MAX_NOTICE_SHEET_NAME_CHARS,
  NO_CAP,
  cutNoticeName,
} from "./reader-limits";

describe("the library's default withholds nothing", () => {
  it("the manual upload asks for NONE of them (no cap per type of document, 07/11/2026) and gets the library's default", () => {
    // A caller that passes no limit gets this one: the largest integer, never the size of a page.
    expect(NO_CAP).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("the values themselves did not change when they moved file (09/11/2026): the reader's own bounds", () => {
  it("holds the library's chart bounds", () => {
    expect({ MAX_CHART_CELLS, MAX_CHART_SERIES, MAX_CHART_POINTS, MAX_CHART_LEVELS }).toEqual({
      MAX_CHART_CELLS: 200_000,
      MAX_CHART_SERIES: 255,
      MAX_CHART_POINTS: 10_000,
      MAX_CHART_LEVELS: 8,
    });
  });

  it("a notice cuts client text at 64 characters, and `cutNoticeName` cuts there", () => {
    expect(MAX_NOTICE_SHEET_NAME_CHARS).toBe(64);
    expect(cutNoticeName("x".repeat(65))).toBe(`${"x".repeat(MAX_NOTICE_SHEET_NAME_CHARS)}…`);
  });
});
