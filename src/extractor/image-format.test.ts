/**
 * Exhaustive audit of 07/10/2026 (P2-F7): PNG/JPEG/GIF were recognised by six byte checks (4 or 8 bytes for PNG, 2 or 3 for JPEG,
 * 3 or 4 for GIF) and their headers read by two readers that disagreed on edge sizes. ONE sniff, ONE header reader.
 */
import { describe, expect, it } from "vitest";
import { imageHeader, sniffImage } from "./image-format";
import { PNG_SIGNATURE } from "./image-pixel-width";

const png = (width: number, height: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set(PNG_SIGNATURE, 0);
  b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
};

describe("one image sniff and one header reader", () => {
  it("🔴 the full 8-byte PNG signature, never its first 4 bytes alone", () => {
    expect(sniffImage(png(10, 10))).toBe("png");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6]))).toBeUndefined();
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("gif");
  });

  it("🔴 a PNG of zero height or of an absurd width has no size, for every reader", () => {
    expect(imageHeader(png(100, 0))).toBeUndefined();
    expect(imageHeader(png(0x80000000, 10))).toBeUndefined();
    expect(imageHeader(png(100, 50))).toMatchObject({ format: "png", width: 100, height: 50 });
  });
});
