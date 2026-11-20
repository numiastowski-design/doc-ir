import { describe, expect, it } from "vitest";

import { READER_ERROR_CODES, ReaderError, type ReaderErrorCode } from "./reader-error";

describe("ReaderError", () => {
  it("carries its code and its message, and is an Error named for the library", () => {
    const error = new ReaderError("EXTRACT_FAILED", "the file is damaged");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("EXTRACT_FAILED");
    expect(error.message).toBe("the file is damaged");
    expect(error.name).toBe("ReaderError");
  });

  it("carries the two page counts of a PDF refusal only when they are given (an absent count reads undefined)", () => {
    const bare = new ReaderError("UNKNOWN", "x");
    expect([bare.pageCount, bare.scannedPageCount]).toEqual([undefined, undefined]);
    const withCounts = new ReaderError("SCANNED_PDF_NEEDS_AI_OCR", "x", { pageCount: 12, scannedPageCount: 12 });
    expect([withCounts.pageCount, withCounts.scannedPageCount]).toEqual([12, 12]);
    const partial = new ReaderError("DOCUMENT_TOO_MANY_PAGES", "x", { pageCount: 40 });
    expect([partial.pageCount, partial.scannedPageCount]).toEqual([40, undefined]);
  });

  it("keeps what a foreign service threw as `cause`, never in the message", () => {
    const upstream = new Error("secret client text");
    const error = new ReaderError("UNKNOWN", "the AI reading failed", { pageCount: 1 }, { cause: upstream });
    expect(error.cause).toBe(upstream);
    expect(error.message).toBe("the AI reading failed");
    expect(new ReaderError("UNKNOWN", "x").cause).toBeUndefined();
  });

  // Two installed copies of the base each have their own class; the shared mark makes them one for `instanceof`
  // (proven on two real builds in `tools/build-library.test.ts`). A subclass keeps the ordinary prototype test.
  it("answers `instanceof` by the shared mark, and leaves a subclass its ordinary test", () => {
    const foreignCopy = Object.create(Error.prototype, {
      [Symbol.for("doc-ir/ReaderError")]: { value: true },
    }) as Error;
    expect(foreignCopy instanceof ReaderError).toBe(true);
    expect(new Error("x") instanceof ReaderError).toBe(false);
    expect(Object.assign(new Error("x"), { name: "ReaderError" }) instanceof ReaderError).toBe(false);
    class Narrower extends ReaderError {}
    expect(new Narrower("UNKNOWN", "x") instanceof ReaderError).toBe(true);
    expect(new Narrower("UNKNOWN", "x") instanceof Narrower).toBe(true);
    expect(new ReaderError("UNKNOWN", "x") instanceof Narrower).toBe(false);
    // The mark is a PROTOTYPE getter: the instance owns no symbol. (`Object.keys` never lists a symbol key, so the
    // former form of this assertion could not fail; lot 4 review, 20/11/2026.)
    expect(Object.getOwnPropertySymbols(new ReaderError("UNKNOWN", "x"))).toEqual([]);
  });

  it("lists its closed catalog once, without duplicate", () => {
    const codes: readonly ReaderErrorCode[] = READER_ERROR_CODES;
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("EXTRACT_FAILED");
    expect(codes).toContain("UNKNOWN");
  });
});
