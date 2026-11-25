import { describe, expect, it } from "vitest";

import { imagePixelWidth } from "./image-pixel-width";

/** A JPEG made of SOI, one APP0 segment, then a start-of-frame segment. */
const jpeg = (sofMarker: number, width: number): Uint8Array =>
  new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    sofMarker,
    0x00,
    0x0b,
    0x08,
    0x00,
    0x2a,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
  ]);

describe("imagePixelWidth — the width a file declares in its own header", () => {
  it("JPEG: the width of the start-of-frame segment (baseline and progressive), after other segments", () => {
    expect(imagePixelWidth(jpeg(0xc0, 640))).toBe(640);
    expect(imagePixelWidth(jpeg(0xc2, 1024))).toBe(1024);
    // 0xC4 (Huffman table) is not a start of frame.
    expect(imagePixelWidth(jpeg(0xc4, 640))).toBeUndefined();
  });

  it("🔴 JPEG with SOF height 0 (deferred to a DNL marker, ITU T.81): the width is still read (recensement 28/09, constat 5)", () => {
    const deferred = jpeg(0xc0, 640);
    deferred[13] = 0;
    deferred[14] = 0;
    // Failure value: undefined — the unified walk demanded height > 0 where
    // the old width-only walker did not, and G2 lost the native width.
    expect(imagePixelWidth(deferred)).toBe(640);
  });

  it("GIF: the logical screen width (little-endian)", () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x2c, 0x01, 0x10, 0x00]);
    expect(imagePixelWidth(gif)).toBe(300);
  });

  it("any other format, or a truncated header: undefined (today's behaviour is kept)", () => {
    expect(imagePixelWidth(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeUndefined();
    expect(imagePixelWidth(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeUndefined();
    expect(imagePixelWidth(new Uint8Array([0xff, 0xd8, 0xff]))).toBeUndefined();
    expect(imagePixelWidth(new Uint8Array([]))).toBeUndefined();
  });
});
