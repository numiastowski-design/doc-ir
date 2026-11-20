import { describe, expect, it } from "vitest";

import { diagramParagraphs } from "./ir";

// Decision n° 5 (12/10/2026): one tolerant cut of a diagram-text section into paragraphs, shared by the renderer,
// the language detection and the pptx extractor.
// Run: npx vitest run --project=main src/lib/ir.diagram-paragraphs.test.ts

const inl = (...texts: string[]) => texts.map((text) => ({ text }));
const texts = (paragraphs: { text: string }[][]): string[][] => paragraphs.map((p) => p.map((i) => i.text));

describe("diagramParagraphs", () => {
  it("no break: one paragraph", () =>
    expect(texts(diagramParagraphs({ inlines: inl("a", "b") }))).toEqual([["a", "b"]]));
  it("valid breaks cut where they say", () =>
    expect(texts(diagramParagraphs({ inlines: inl("a", "b", "c", "d"), breaks: [1, 3] }))).toEqual([
      ["a"],
      ["b", "c"],
      ["d"],
    ]));
  it("unsorted breaks are sorted", () =>
    expect(texts(diagramParagraphs({ inlines: inl("a", "b", "c", "d"), breaks: [3, 1] }))).toEqual([
      ["a"],
      ["b", "c"],
      ["d"],
    ]));
  it("duplicates, zero, length and beyond are ignored", () =>
    expect(texts(diagramParagraphs({ inlines: inl("a", "b", "c", "d"), breaks: [2, 2, 0, -1, 4, 9] }))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]));
  it("no inline: a single empty paragraph, nothing dropped", () =>
    expect(texts(diagramParagraphs({ inlines: [], breaks: [1] }))).toEqual([[]]));
});
