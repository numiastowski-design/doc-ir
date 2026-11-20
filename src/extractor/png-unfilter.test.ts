import { describe, expect, it } from "vitest";

import { unfilterPngRows } from "./png-unfilter";

describe("unfilterPngRows — the five PNG row filters, 8 bits per channel", () => {
  it("copies a row with no filter", () => {
    expect(unfilterPngRows(new Uint8Array([0, 10, 20, 30]), 3, 1, 1)).toEqual(new Uint8Array([10, 20, 30]));
  });

  it("adds the pixel on the left (Sub), one channel apart", () => {
    // Two RGB pixels: the second is stored as its difference with the first.
    expect(unfilterPngRows(new Uint8Array([1, 10, 20, 30, 1, 2, 3]), 2, 1, 3)).toEqual(
      new Uint8Array([10, 20, 30, 11, 22, 33]),
    );
  });

  it("adds the pixel above (Up), the mean of left and above (Average), and the closest of three (Paeth)", () => {
    const rows = new Uint8Array([0, 10, 20, 2, 1, 1, 3, 5, 5, 4, 1, 1]);
    expect(unfilterPngRows(rows, 2, 4, 1)).toEqual(new Uint8Array([10, 20, 11, 21, 10, 20, 11, 21]));
  });

  it("wraps at 256", () => {
    expect(unfilterPngRows(new Uint8Array([1, 200, 100]), 2, 1, 1)).toEqual(new Uint8Array([200, 44]));
  });

  it("gives nothing for a length that is not the announced one, or for a filter the format does not have", () => {
    expect(unfilterPngRows(new Uint8Array([0, 10, 20]), 3, 1, 1)).toBeUndefined();
    expect(unfilterPngRows(new Uint8Array([5, 10, 20, 30]), 3, 1, 1)).toBeUndefined();
  });
});
