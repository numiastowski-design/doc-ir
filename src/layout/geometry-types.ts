/** The shapes the geometry modules pass to one another: a text fragment, a
 *  grid and its merged cells, a painted line, a 2D matrix.
 *  NOT here: every decision taken on them — the grid read from painted lines
 *  (`layout/vector-grid.ts`) or from aligned columns (`layout/aligned-grid.ts`),
 *  the placement of fragments (`layout/fragment-cells.ts`), the column
 *  discriminant (`layout/column-discriminant.ts`).
 *  Called by: every other `layout/` geometry module, `core/entities.ts` (for
 *  `PdfTableOrigin` and `PdfTableDetection` alone), and the
 *  `extractor/pdf-*.ts` files through the `layout/geometry.ts` façade. */

/** Which detection stage found a table. Defined here, where the detector produces it, not where it is persisted: a
 *  pure module does not import upwards. */
export type PdfTableOrigin = "vector-borders" | "alignment-no-borders" | "no-grid";

/** One table candidate of a PDF page: which page, and which detection stage found it. The detectors PRODUCE it; `core/entities.ts` re-exports it
 *  because `SyncedDocument.pdfTableDetections` persists it. */
export interface PdfTableDetection {
  pageIndex: number;
  origin: PdfTableOrigin;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Thickness of the stroke this segment comes from. */
  thickness?: number;
}

export type ClassifiedLine =
  | { orientation: "horizontal"; y: number; xMin: number; xMax: number; thickness?: number }
  | { orientation: "vertical"; x: number; yMin: number; yMax: number; thickness?: number };

export interface Fragment {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface TableGrid {
  /** y positions, descending (top row first). N boundaries ⇒ N−1 rows. */
  rowBoundaries: number[];
  /** x positions, ascending (left column first). N boundaries ⇒ N−1 columns. */
  colBoundaries: number[];
}

/** A real cell of the grid: the slot where it starts and its extent on both axes. */
export interface MergedCell {
  row: number;
  col: number;
  colspan: number;
  rowspan: number;
}

/**
 * The merges of a grid, as one structure. Tried and set aside: `colspan` rows whose sum is the column count, an
 * invariant that turns false as soon as a cell is merged vertically, since a covered row emits fewer cells.
 *
 * The invariant that holds on both axes: every slot of the grid is held by exactly one cell. `ownerAt` states it, and
 * it makes the ambiguity check symmetric: a fragment that spills onto a neighbouring slot crosses nothing when both
 * slots have the same owner.
 */
export interface MergeMap {
  /** The real cells, in reading order: row, then column. */
  cells: readonly MergedCell[];
  /** `ownerAt[row][col]`: the index in `cells` of the cell holding that slot. One entry per slot, no hole. */
  ownerAt: readonly (readonly number[])[];
}

export interface CellAssignment<T extends Fragment = Fragment> {
  /** `cells[row][col]` — every in-bounds fragment lands in exactly one
   *  cell here (its CENTER-based one — see `ambiguous` below for the
   *  fragments where that rule is uncertain), reading order preserved.
   *  "Rien n'est perdu" (§8): a fragment is never dropped just for being
   *  ambiguous, only flagged as such IN ADDITION to being placed. */
  cells: T[][][];
  /** A fragment whose bounding box crosses a
   *  row or column boundary its OWN center-assigned cell doesn't own is
   *  flagged here: a merged cell, a multi-line entry spanning into the
   *  next row band, or a mis-detected boundary would all show up this
   *  way. The "lightweight conservation invariant" jalon 1 needs — not
   *  "was anything lost" (nothing ever is), but "does this grid explain
   *  every fragment WITHOUT ambiguity". A non-empty result downgrades
   *  confidence in the detected grid; jalon 2 is where that becomes an
   *  actual régime-1/régime-2 decision. */
  ambiguous: T[];
  /** Fragments entirely outside the grid's bounding box — ordinary
   *  surrounding prose (a caption, a paragraph before/after the table),
   *  expected and not part of this grid's own accounting at all. */
  outside: T[];
}

/** A cell found by intersections: its four edges are painted, not deduced. `yBottom` < `yTop` (PDF y grows upwards). */
export interface CellRect {
  xLeft: number;
  xRight: number;
  yBottom: number;
  yTop: number;
}

export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
