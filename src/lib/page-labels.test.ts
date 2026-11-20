/**
 * `resolveLabels` — the one place a caller's labels meet ours (étape 8 de `docs/PLAN-BIBLIOTHEQUE.md`).
 * Failure values recorded before the code existed: `resolveLabels` did not exist, so a caller had no way in at all.
 * Run: npx vitest run --project=main src/lib/page-labels.test.ts
 */
import { describe, expect, it } from "vitest";

import { pageLabels, resolveLabels } from "./page-labels";

describe("resolveLabels", () => {
  it("no override: the page language's own table, unchanged", () => {
    expect(resolveLabels("fr").slideTabTitle(2)).toBe("Diapositive 2");
    expect(resolveLabels("en").slideTabTitle(2)).toBe("Slide 2");
    expect(resolveLabels("fr")).toEqual(pageLabels("fr"));
  });

  it("one field given replaces that field only", () => {
    const labels = resolveLabels("fr", { slideTabTitle: (n) => `Folie ${n}` });
    expect(labels.slideTabTitle(1)).toBe("Folie 1");
    expect(labels.pdfPageTabTitle(1)).toBe("Page 1");
    expect(labels.noteCallLabel(1)).toBe("[1]");
  });

  it("every field given: nothing of ours is left", () => {
    const labels = resolveLabels("en", {
      slideTabTitle: (n) => `Folie ${n}`,
      pdfPageTabTitle: (n) => `Seite ${n}`,
      noteCallLabel: (n) => `(${n})`,
    });
    expect([labels.slideTabTitle(3), labels.pdfPageTabTitle(3), labels.noteCallLabel(3)]).toEqual([
      "Folie 3",
      "Seite 3",
      "(3)",
    ]);
  });

  it("an empty override is the page language's table", () => {
    expect(resolveLabels("en", {})).toEqual(pageLabels("en"));
  });
});
