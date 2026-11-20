/** 08/10/2026, defects D4 and D5 (code review): the occupancy of merged cells and the empty-header-row scan were rewritten to be
 *  bounded in time and memory. This test pins that the output did NOT change: the reference below is the previous
 *  implementation of `lib/table-empty-parts.ts`, pasted unchanged (only renamed), compared on 3 000 reproducible random tables
 *  (hand-written seeded generator, no Math.random) with varied, degenerate (0, negative, fractional, NaN) and very large spans.
 *  Run: npx vitest run --project=main src/lib/table-empty-parts.equivalence.test.ts */
import { describe, expect, it } from "vitest";

import type { IRBlock } from "./ir";
import { tableGridWidth, withoutEmptyTableParts } from "./table-empty-parts";

type TableBlock = Extract<IRBlock, { kind: "table" }>;
type Row = TableBlock["rows"][number];
type Cell = Row["cells"][number];

/* True when the blocks publish something: text beyond blanks, an inline image or anchor, or any block that is not a bare text one. */
const hasContent = (blocks: readonly IRBlock[]): boolean =>
  blocks.some((b) => {
    switch (b.kind) {
      case "paragraph":
      case "heading":
        return b.inlines.some((i) => i.text.trim() !== "" || i.image !== undefined || i.anchor !== undefined);
      case "list":
        return b.items.some(hasContent);
      case "table":
        return b.rows.some((r) => r.cells.some((c) => hasContent(c.blocks)));
      default:
        return true;
    }
  });

/* A cell always spans at least one column; a degenerate value (0, negative, fractional, NaN) reads as 1. */
const spanOf = (declared: number | undefined): number => {
  const n = Math.floor(declared ?? 1);
  return n >= 1 ? n : 1;
};

/* The column each cell is ANCHORED in (the one it starts in; rowspans of earlier rows push it right) and the grid width. */
const oldAnchorsOf = (table: TableBlock): { anchors: number[][]; gridWidth: number } => {
  const occupiedUntil: number[][] = table.rows.map(() => []);
  const anchors: number[][] = [];
  let gridWidth = 0;
  table.rows.forEach((row, r) => {
    const taken = new Set(occupiedUntil[r]);
    let col = 0;
    anchors.push(
      row.cells.map((cell) => {
        while (taken.has(col)) col++;
        const start = col;
        const colspan = spanOf(cell.colspan);
        for (let k = 0; k < colspan; k++) {
          for (let down = 1; down < (cell.rowspan ?? 1); down++) occupiedUntil[r + down]?.push(start + k);
        }
        col += colspan;
        gridWidth = Math.max(gridWidth, col);
        return start;
      }),
    );
  });
  return { anchors, gridWidth };
};

/* The grid width of a table: the widest row in grid columns, a merged cell counting for its span. */
const oldTableGridWidth = (table: TableBlock): number => oldAnchorsOf(table).gridWidth;

/* The table without its empty columns and empty header row, the same object when there is nothing to remove, `null` when
 *  nothing is left to publish. */
const oldWithoutEmptyTableParts = (table: TableBlock): TableBlock | null => {
  if (table.rows.length === 0) return table;

  const { anchors, gridWidth } = oldAnchorsOf(table);

  const filled = new Set<number>();
  table.rows.forEach((row, r) =>
    row.cells.forEach((cell, c) => {
      if (hasContent(cell.blocks)) filled.add(anchors[r]![c]!);
    }),
  );
  if (filled.size === 0) return null;

  const keptBefore: number[] = []; // keptBefore[c] = kept columns among 0..c-1
  for (let c = 0; c <= gridWidth; c++) keptBefore.push(c === 0 ? 0 : keptBefore[c - 1]! + (filled.has(c - 1) ? 1 : 0));
  const removedAny = filled.size < gridWidth;

  const narrowed: Row[] = table.rows.map((row, r) => ({
    ...row,
    cells: row.cells.flatMap((cell, c): Cell[] => {
      if (!removedAny) return [cell];
      const start = anchors[r]![c]!;
      const span = spanOf(cell.colspan);
      const kept = keptBefore[Math.min(start + span, gridWidth)]! - keptBefore[start]!;
      if (kept === 0) return [];
      if (kept === span) return [cell];
      const { colspan: _unused, ...rest } = cell;
      void _unused;
      return [kept > 1 ? { ...rest, colspan: kept } : rest];
    }),
  }));

  // An all-empty header row, not crossed by a span and spanning none downward.
  const dropRow = narrowed.map((row, i) => {
    if (row.cells.length === 0) return false;
    if (!row.cells.every((c) => c.header === true && c.rowspan === undefined && !hasContent(c.blocks))) {
      return false;
    }
    return !narrowed.slice(0, i).some((above, j) => above.cells.some((c) => (c.rowspan ?? 1) > i - j));
  });
  const removedRows = dropRow.includes(true);
  if (!removedAny && !removedRows) return table;

  const { columnWidths, ...others } = table;
  const rows = narrowed.filter((_, i) => !dropRow[i]);
  const widths =
    columnWidths !== undefined && columnWidths.length === gridWidth
      ? removedAny
        ? columnWidths.filter((_, c) => filled.has(c))
        : columnWidths
      : undefined;
  return { ...others, rows, ...(widths ? { columnWidths: widths } : {}) };
};

/** mulberry32: a small seeded generator. */
const seeded = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const SPANS = [undefined, undefined, undefined, 1, 1, 2, 3, 5, 0, -2, 2.5, 1.2, Number.NaN, 40, 1000];

const randomTable = (rand: () => number): TableBlock => {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const nRows = 1 + Math.floor(rand() * 9);
  const rows = Array.from({ length: nRows }, (_, r) => {
    const nCells = Math.floor(rand() * 7); // 0 cells: a row of nothing
    const headerRow = r < 3 && rand() < 0.5;
    return {
      cells: Array.from({ length: nCells }, () => {
        const filled = rand() < 0.45;
        const cell: Cell = {
          blocks: filled
            ? [{ kind: "paragraph", inlines: [{ text: rand() < 0.1 ? "  " : "w" }] }]
            : rand() < 0.5
              ? []
              : [{ kind: "paragraph", inlines: [{ text: " " }] }],
        };
        const cs = pick(SPANS);
        const rs = pick(SPANS);
        if (cs !== undefined) cell.colspan = cs;
        // The previous implementation costs colspan x rowspan: two huge spans on one cell would not finish.
        if (rs !== undefined && rand() < 0.6 && !(Number(cs) > 100 && Number(rs) > 10)) cell.rowspan = rs;
        if (headerRow || rand() < 0.15) cell.header = true;
        return cell;
      }),
    };
  });
  const t: TableBlock = { kind: "table", rows };
  return rand() < 0.3 ? t : { ...t, columnWidths: Array.from({ length: Math.floor(rand() * 12) }, (_, i) => i + 1) };
};

describe("table-empty-parts — the bounded rewrite gives the output of the previous implementation", () => {
  it("3 000 random tables (degenerate and huge spans, empty cells and rows): same result, same grid width", () => {
    const rand = seeded(20261008);
    let nonTrivial = 0;
    for (let i = 0; i < 3000; i++) {
      const t = randomTable(rand);
      const expected = oldWithoutEmptyTableParts(t);
      const actual = withoutEmptyTableParts(t);
      expect(actual, `table #${i}: ${JSON.stringify(t)}`).toEqual(expected);
      expect(tableGridWidth(t), `width of table #${i}`).toBe(oldTableGridWidth(t));
      if (expected !== null && expected !== t) nonTrivial++;
    }
    // Fixture check: the comparison exercises removals, not only identity.
    expect(nonTrivial).toBeGreaterThan(500);
  }, 60_000);

  it("empty header rows under a rowspan from above or from several rows above: same result as before", () => {
    const rand = seeded(7);
    for (let i = 0; i < 500; i++) {
      const n = 3 + Math.floor(rand() * 6);
      const rows = Array.from({ length: n }, (_, r) => ({
        cells: [
          { header: true, blocks: [] },
          ...(rand() < 0.3 ? [{ header: true, blocks: [], rowspan: 1 + Math.floor(rand() * 4) } as Cell] : []),
          ...(r === n - 1 ? [{ blocks: [{ kind: "paragraph", inlines: [{ text: "keep" }] }] } as Cell] : []),
        ],
      }));
      const t: TableBlock = { kind: "table", rows };
      expect(withoutEmptyTableParts(t), `table #${i}`).toEqual(oldWithoutEmptyTableParts(t));
    }
  });
});
