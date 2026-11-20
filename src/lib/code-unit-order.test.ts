import { describe, expect, it } from "vitest";

import { byCodeUnit } from "./code-unit-order";

/** Each list is given out of order, and holds what tells this order from an alphabetical one. */
const LISTS: Readonly<Record<string, readonly string[]>> = {
  prefixes: ["abc", "", "ab", "b", "a", "abd"],
  "upper and lower case": ["b", "B", "a", "A", "Zebra", "apple", "Apple"],
  "accented letters": ["é", "z", "e", "É", "E", "ë", "ez", "éa"],
  // U+1F600 is written as the pair D83D DE00: below U+FFFF by code unit, above it by code point.
  "a surrogate pair": ["￿", "\u{1f600}", "퟿", "a", "\u{1f600}a", ""],
  digits: ["10", "9", "2", "1", "01", "100", "a1", "1a"],
  "all of it": ["é", "", "10", "B", "\u{1f600}", "a", "9", "ab", "É", "￿", "A", "b"],
};

describe("byCodeUnit", () => {
  for (const [name, list] of Object.entries(LISTS)) {
    it(`sorts as sort() does without a comparator: ${name}`, () => {
      expect([...list].sort(byCodeUnit)).toEqual([...list].sort());
      expect([...list].reverse().sort(byCodeUnit)).toEqual([...list].sort());
    });
  }

  it("answers 0 for equal strings, and opposite signs when the arguments swap", () => {
    expect(byCodeUnit("a", "a")).toBe(0);
    expect(byCodeUnit("", "")).toBe(0);
    expect(byCodeUnit("a", "b")).toBe(-1);
    expect(byCodeUnit("b", "a")).toBe(1);
  });
});
