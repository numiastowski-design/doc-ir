import { describe, expect, it } from "vitest";

import type { Inline, IRBlock } from "./ir";
import { tableExceedsCaps, withholdOversizedTables } from "./table-width-cap";

// The caps this test exercises are ITS OWN: the library holds none since 09/11/2026 (« c'est à l'user de
// skryba de mettre ses propres limites »), it applies what its caller asks — `core/document-caps.ts#PRODUCT_READER_LIMITS`
// is what Miksumia Publisher asks. The values here are the product's, so the fixtures stay the ones the review read,
// and every call below passes them.
const MAX_TABLE_COLS = 21;
const LIMITS = { tableCols: MAX_TABLE_COLS, tableRows: 200 } as const;

// Run: npx vitest run --project=main src/lib/table-width-cap.test.ts
const wideTable = (special: Inline[]): IRBlock => ({
  kind: "table",
  rows: [
    {
      cells: Array.from({ length: MAX_TABLE_COLS + 1 }, (_, i) => ({
        blocks: [{ kind: "paragraph" as const, inlines: i === 0 ? special : [{ text: `c${i}` }] }],
      })),
    },
  ],
});

const removalsOf = (blocks: IRBlock[]): string[] => {
  const removed: string[] = [];
  withholdOversizedTables(blocks, (text) => removed.push(text), LIMITS);
  return removed;
};

describe("withholdOversizedTables — the text a withheld table declares removed", () => {
  it("a cell's word cut by a superscript call is declared whole, as the PDF's text layer has it", () => {
    // Corpus 043 p15 (23/10/2026): « 30²⁾ » in a 25-column table, published since rendu 112 as « 30 » + sup « 2) »; declared
    // inline by inline, the check could not match the text layer's « 302) » and reported 25 words lost.
    // FAILS WITH: expected [ '30', '2)', … ] to include '302)'.
    const removed = removalsOf([wideTable([{ text: "30" }, { text: "2)", marks: ["sup"] }])]);
    expect(removed).toContain("302)");
    expect(removed).not.toContain("30");
  });

  it("a cell paragraph cut by a link is declared whole too", () => {
    // FAILS WITH: expected [ 'see ', 'here', … ] to include 'see here'.
    const removed = removalsOf([wideTable([{ text: "see " }, { text: "here", href: "https://example.org" }])]);
    expect(removed).toContain("see here");
  });

  it("control: a table within the caps declares nothing and stays", () => {
    const narrow: IRBlock = {
      kind: "table",
      rows: [{ cells: [{ blocks: [{ kind: "paragraph", inlines: [{ text: "kept" }] }] }] }],
    };
    const removed: string[] = [];
    const out = withholdOversizedTables([narrow], (text) => removed.push(text), LIMITS);
    expect(removed).toEqual([]);
    expect(out).toMatchObject({ withheld: 0, blocks: [narrow] });
  });
});

// Plan step 5: the caps are a PARAMETER of the decision; a field left out withholds NOTHING (09/11/2026).
describe("the table caps are a parameter (ReaderLimits), and nothing is withheld without them", () => {
  const table = (cols: number, rows: number): IRBlock => ({
    kind: "table",
    rows: Array.from({ length: rows }, (_, r) => ({
      cells: Array.from({ length: cols }, (_, c) => ({
        blocks: [{ kind: "paragraph" as const, inlines: [{ text: `r${r}c${c}` }] }],
      })),
    })),
  });

  it("tableExceedsCaps takes the column and row caps from its limits", () => {
    expect(tableExceedsCaps(5, 3)).toBe(false);
    expect(tableExceedsCaps(5, 3, { tableCols: 4 })).toBe(true);
    expect(tableExceedsCaps(5, 3, { tableCols: 5 })).toBe(false);
    expect(tableExceedsCaps(2, 3, { tableRows: 2 })).toBe(true);
    expect(tableExceedsCaps(2, 2, { tableRows: 2 })).toBe(false);
  });

  it("a table of any size passes when no cap is given: the library imposes none (09/11/2026)", () => {
    // Failure value before: `{}` meant the product's 21 columns, so this was true and a 22-column table of a
    // caller that had asked for nothing came back withheld.
    expect(tableExceedsCaps(MAX_TABLE_COLS + 1, 1, {})).toBe(false);
    expect(tableExceedsCaps(10_000, 1_000_000)).toBe(false);
    expect(tableExceedsCaps(MAX_TABLE_COLS + 1, 1, LIMITS)).toBe(true);
  });

  it("withholdOversizedTables withholds under the limits it is given, and removes nothing without them", () => {
    const three = table(3, 2);
    const removed: string[] = [];
    // FAILS WITH (limits ignored): expected 0 to be 1.
    expect(withholdOversizedTables([three], (text) => removed.push(text), { tableCols: 2 })).toMatchObject({
      withheld: 1,
      blocks: [],
    });
    expect(removed).toContain("r0c0");
    expect(withholdOversizedTables([three], undefined, { tableRows: 1 })).toMatchObject({ withheld: 1, blocks: [] });
    expect(withholdOversizedTables([three])).toMatchObject({ withheld: 0, blocks: [three] });
    expect(withholdOversizedTables([three], undefined, { tableCols: 3, tableRows: 2 })).toMatchObject({ withheld: 0 });
  });
});
