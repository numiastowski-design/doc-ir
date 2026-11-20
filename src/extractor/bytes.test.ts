import { describe, expect, it } from "vitest";

import { concatBytes } from "./bytes";

describe("concatBytes", () => {
  it("lays the parts end to end in a fresh array, empty parts included", () => {
    const a = new Uint8Array([1, 2]);
    const out = concatBytes([a, new Uint8Array(0), new Uint8Array([3]), Buffer.from([4, 5])]);
    expect([...out]).toEqual([1, 2, 3, 4, 5]);
    out[0] = 9;
    expect(a[0]).toBe(1); // a copy, never the first part itself
  });

  it("gives an empty array for no part", () => {
    expect(concatBytes([]).length).toBe(0);
  });

  it("allocates the total it is given: a larger total leaves zeros at the end, a smaller one is refused", () => {
    const parts = [new Uint8Array([7]), new Uint8Array([8])];
    expect([...concatBytes(parts, 4)]).toEqual([7, 8, 0, 0]);
    expect(() => concatBytes(parts, 1)).toThrow(RangeError);
  });
});
