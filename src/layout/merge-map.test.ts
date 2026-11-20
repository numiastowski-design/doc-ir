import { describe, expect, it } from "vitest";

import type { TableGrid } from "./geometry-types";
import { buildMergeMap } from "./merge-map";

/** Seven columns and three rows, the boundaries measured on a real report card. */
const COLUMNS = 7;
const grid: TableGrid = {
  rowBoundaries: [707, 689, 632, 575],
  colBoundaries: [28.3, 123.3, 141.9, 166.6, 185.2, 203.8, 222.4, 567.1],
};

describe("buildMergeMap — every square of the grid has an owner", () => {
  it("gives each square of the grid EXACTLY one owner", () => {
    const spans = [
      [1, 1, 4, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    const map = buildMergeMap(grid, spans);
    expect(map.ownerAt).toHaveLength(grid.rowBoundaries.length - 1);
    for (const row of map.ownerAt) {
      expect(row).toHaveLength(COLUMNS);
      for (const owner of row) {
        expect(owner).toBeGreaterThanOrEqual(0);
        expect(owner).toBeLessThan(map.cells.length);
      }
    }
    // A square covered by a merge carries the index of the cell that covers it, not its own.
    expect(map.ownerAt[0]!.slice(2, 6)).toEqual([2, 2, 2, 2]);
    expect(map.cells[2]).toEqual({ row: 0, col: 2, colspan: 4, rowspan: 1 });
  });

  it("lists the cells in READING ORDER, so that the rows are written without sorting again", () => {
    const map = buildMergeMap(grid, [[1, 1, 4, 1]]);
    expect(map.cells.slice(0, 4).map((cell) => [cell.row, cell.col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 6],
    ]);
  });

  it("leaves NO square without an owner when the column spans are too short", () => {
    const map = buildMergeMap(grid, [[1, 1]]);
    expect(map.ownerAt[0]!.every((owner) => owner >= 0)).toBe(true);
    expect(map.ownerAt[0]).toHaveLength(COLUMNS);
  });
});
