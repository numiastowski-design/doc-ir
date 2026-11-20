/** A table without its empty columns and its empty header row (08/10/2026): none is published, in any format, as the
 *  PDF reader already does. A column is EMPTY when no cell ANCHORED in it (the column a merged cell starts in) holds text beyond
 *  blanks, an image, an anchor or any other published block. A merged cell loses one span per removed column it covers; an empty
 *  one covering only removed columns goes. The relative widths of a removed column go with it. An all-empty header row is left
 *  out and the row after it keeps its own kind. Cost O(rows x grid width + cells), whatever the spans
 *  (the app's `src/renderer/storage.empty-parts-hostile-spans.test.ts`, `table-empty-parts.equivalence.test.ts`).
 *  NOT here: the empty `<tr>` left by spans (`renderer/storage.ts#withoutEmptyRows`), the PDF's own column analysis
 *  (`extractor/pdf-table-render.ts`), the PDF reader's fold of a header painted in layers (`lib/table-leading-bands.ts`), nor
 *  any reading of a source file.
 *  Called by: `renderer/storage.ts`, `lib/table-width-cap.ts`, `lib/table-leading-bands.ts`, `extractor/docx-reader/body.ts`. */

import type { IRBlock } from "./ir";

type TableBlock = Extract<IRBlock, { kind: "table" }>;
type Row = TableBlock["rows"][number];
type Cell = Row["cells"][number];

/** True when the blocks publish something: text beyond blanks, an inline image or anchor, or any block that is not a bare text one. */
export const hasContent = (blocks: readonly IRBlock[]): boolean =>
  blocks.some((block) => {
    switch (block.kind) {
      case "paragraph":
      case "heading":
        return block.inlines.some(
          (inline) => inline.text.trim() !== "" || inline.image !== undefined || inline.anchor !== undefined,
        );
      case "list":
        return block.items.some(hasContent);
      case "table":
        return block.rows.some((row) => row.cells.some((cell) => hasContent(cell.blocks)));
      default:
        return true;
    }
  });

/** A cell always spans at least one column; a degenerate value (0, negative, fractional, NaN) reads as 1. */
export const spanOf = (declared: number | undefined): number => {
  const whole = Math.floor(declared ?? 1);
  return whole >= 1 ? whole : 1;
};

/** A rowspan reaches `ceil(rowspan) - 1` rows below its cell; a degenerate value (<= 1, NaN) reaches none. */
export const rowsBelow = (declared: number | undefined): number => {
  const span = declared ?? 1;
  return span > 1 ? Math.ceil(span) - 1 : 0;
};

/** A column range `[start, end)` that rows up to `until` (inclusive) find taken by a rowspan above. */
type Taken = { start: number; end: number; until: number };

/** The column each cell is ANCHORED in (the one it starts in; rowspans of earlier rows push it right) and the grid width.
 *  Time O(rows x grid width + cells), memory O(cells): the columns a rowspan covers are kept as ONE range, never expanded
 *  one by one (a colspan x rowspan cell would cost the product). The live ranges all start in distinct columns (a cell never
 *  anchors in a taken column), so a row meets at most grid-width of them. */
export const anchorsOf = (table: TableBlock): { anchors: number[][]; gridWidth: number } => {
  let live: Taken[] = []; // sorted by start
  const anchors: number[][] = [];
  let gridWidth = 0;
  table.rows.forEach((row, rowIndex) => {
    live = live.filter((range) => range.until >= rowIndex);
    const added: Taken[] = [];
    let next = 0; // live[next..] start beyond the column reached
    let col = 0;
    anchors.push(
      row.cells.map((cell) => {
        // The first column at or after `col` no live range covers.
        while (next < live.length && live[next]!.start <= col) {
          col = Math.max(col, live[next]!.end);
          next++;
        }
        const start = col;
        const colspan = spanOf(cell.colspan);
        const below = rowsBelow(cell.rowspan);
        if (below > 0)
          added.push({ start, end: start + colspan, until: Math.min(rowIndex + below, table.rows.length - 1) });
        col += colspan;
        gridWidth = Math.max(gridWidth, col);
        return start;
      }),
    );
    if (added.length > 0) live = [...live, ...added].sort((left, right) => left.start - right.start);
  });
  return { anchors, gridWidth };
};

/** The grid width of a table: the widest row in grid columns, a merged cell counting for its span. */
export const tableGridWidth = (table: TableBlock): number => anchorsOf(table).gridWidth;

/** The table without its empty columns and empty header row, the same object when there is nothing to remove, `null` when
 *  nothing is left to publish. */
export const withoutEmptyTableParts = (table: TableBlock): TableBlock | null => {
  if (table.rows.length === 0) return table;

  const { anchors, gridWidth } = anchorsOf(table);

  const filled = new Set<number>();
  table.rows.forEach((row, rowIndex) =>
    row.cells.forEach((cell, cellIndex) => {
      if (hasContent(cell.blocks)) filled.add(anchors[rowIndex]![cellIndex]!);
    }),
  );
  if (filled.size === 0) return null;

  const keptBefore: number[] = []; // keptBefore[column] = kept columns among 0..column-1
  for (let column = 0; column <= gridWidth; column++)
    keptBefore.push(column === 0 ? 0 : keptBefore[column - 1]! + (filled.has(column - 1) ? 1 : 0));
  const removedAny = filled.size < gridWidth;

  const narrowed: Row[] = table.rows.map((row, rowIndex) => ({
    ...row,
    cells: row.cells.flatMap((cell, cellIndex): Cell[] => {
      if (!removedAny) return [cell];
      const start = anchors[rowIndex]![cellIndex]!;
      const span = spanOf(cell.colspan);
      const kept = keptBefore[Math.min(start + span, gridWidth)]! - keptBefore[start]!;
      if (kept === 0) return [];
      if (kept === span) return [cell];
      const { colspan: _unused, ...rest } = cell;
      void _unused;
      return [kept > 1 ? { ...rest, colspan: kept } : rest];
    }),
  }));

  // An all-empty header row, not crossed by a span and spanning none downward. `reach` = the first row no span of the rows
  // above still covers (one pass: the running maximum of row + rowspan).
  let reach = 0;
  const dropRow = narrowed.map((row, rowIndex) => {
    const crossed = reach > rowIndex;
    for (const cell of row.cells) {
      const end = rowIndex + (cell.rowspan ?? 1);
      if (end > reach) reach = end;
    }
    if (row.cells.length === 0) return false;
    if (!row.cells.every((cell) => cell.header === true && cell.rowspan === undefined && !hasContent(cell.blocks))) {
      return false;
    }
    return !crossed;
  });
  const removedRows = dropRow.includes(true);
  if (!removedAny && !removedRows) return table;

  const { columnWidths, ...others } = table;
  const rows = narrowed.filter((_row, rowIndex) => !dropRow[rowIndex]);
  const widths =
    columnWidths !== undefined && columnWidths.length === gridWidth
      ? removedAny
        ? columnWidths.filter((_width, column) => filled.has(column))
        : columnWidths
      : undefined;
  return { ...others, rows, ...(widths ? { columnWidths: widths } : {}) };
};
