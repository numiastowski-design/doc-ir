/** The merge map of a table grid: which cell owns each square, built from spans that are already KNOWN.
 *  Decides: how per-row column spans and downward merges become rectangular cells, in reading order.
 *  NOT here: reading the spans from the strokes of a page (`layout/merged-cells.ts`, the PDF's), nor the
 *  cell text.
 *  Called by: `layout/merged-cells.ts` (spans read from separators), `layout/slide-layout.ts` (spans a slide declares). */

import type { MergeMap, MergedCell, TableGrid } from "./geometry-types";

/**
 * Builds the map from the column spans of each row.
 *
 * THE ORDER OF THE WALK IS THE CONTRACT: row by row, column by column, so `cells` is in reading order. Whatever
 * consumes the map relies on it to write its rows without sorting again.
 *
 * An inconsistent input — column spans that do not add up to the number of columns — does not produce a map with
 * holes: the remaining columns become ordinary cells. EVERY SQUARE HAS AN OWNER, ALWAYS, because the ambiguity
 * check draws its validity from that invariant.
 */
export function buildMergeMap(
  grid: TableGrid,
  columnSpans: readonly (readonly number[])[],
  rowMerges: readonly (readonly boolean[])[] = [],
): MergeMap {
  const rowCount = Math.max(0, grid.rowBoundaries.length - 1);
  const colCount = Math.max(0, grid.colBoundaries.length - 1);
  const cells: MergedCell[] = [];
  const ownerAt: number[][] = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => -1));

  /** The column span of a cell that STARTS on this square, 0 otherwise. A table rather than a sequential read: in a
   *  row partly covered by a merge coming from above, the remaining cells no longer start at column 0. */
  const spanAt: number[][] = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => 0));
  for (let row = 0; row < rowCount; row++) {
    let col = 0;
    for (const span of columnSpans[row] ?? []) {
      if (col >= colCount) break;
      spanAt[row]![col] = Math.min(Math.max(1, span), colCount - col);
      col += spanAt[row]![col]!;
    }
  }

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      if (ownerAt[row]![col] !== -1) continue;
      const colspan = spanAt[row]![col] || 1;

      // The downward merge extends only while ALL the covered columns are merged downward: a cell stays a
      // RECTANGLE. A staircase merge does not exist in HTML, and inventing one would produce a table no writer
      // could render.
      let rowspan = 1;
      while (row + rowspan < rowCount) {
        const boundary = rowMerges[row + rowspan - 1];
        if (boundary === undefined) break;
        let allMerged = true;
        for (let covered = col; covered < col + colspan && allMerged; covered++) allMerged = boundary[covered] === true;
        if (!allMerged) break;
        rowspan += 1;
      }

      const index = cells.length;
      cells.push({ row, col, colspan, rowspan });
      for (let ownedRow = row; ownedRow < row + rowspan; ownedRow++) {
        for (let ownedCol = col; ownedCol < col + colspan; ownedCol++) ownerAt[ownedRow]![ownedCol] = index;
      }
    }
  }
  return { cells, ownerAt };
}
