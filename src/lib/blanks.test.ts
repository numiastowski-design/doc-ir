import { describe, expect, it } from "vitest";
import { collapseBlanks } from "./blanks";

describe("collapseBlanks", () => {
  it("folds every run of whitespace to one space, line breaks and non-breaking spaces included, and trims the ends", () => {
    expect(collapseBlanks("  a \t b\n\n c  d  ")).toBe("a b c d");
    expect(collapseBlanks("a  b\nc")).toBe("a b c");
  });
  it("leaves a blank-only string empty and a clean one untouched", () => {
    expect(collapseBlanks(" \n\t ")).toBe("");
    expect(collapseBlanks("R&D <core>")).toBe("R&D <core>");
  });
  it("does not treat a zero-width space as a blank", () => {
    expect(collapseBlanks("a​b")).toBe("a​b");
  });
});
