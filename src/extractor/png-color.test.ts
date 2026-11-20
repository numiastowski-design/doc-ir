import { describe, expect, it } from "vitest";

import { channelsOfColorType, colorTypeOfChannels, hasAlphaChannel } from "./png-color";

describe("PNG colour types", () => {
  it("maps grey, grey + alpha, RGB, RGB + alpha to 1, 2, 3, 4 channels and back (types 0, 4, 2, 6)", () => {
    expect([0, 4, 2, 6].map(channelsOfColorType)).toEqual([1, 2, 3, 4]);
    expect(([1, 2, 3, 4] as const).map(colorTypeOfChannels)).toEqual([0, 4, 2, 6]);
  });

  it("knows no palette (3), no unassigned type, no inherited key", () => {
    expect([3, 1, 5, 7, -1, Number.NaN].map(channelsOfColorType)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("flags an alpha channel for grey + alpha and RGB + alpha only", () => {
    expect(([1, 2, 3, 4] as const).map(hasAlphaChannel)).toEqual([false, true, false, true]);
  });
});
