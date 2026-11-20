/**
 * THE CHECK NO LONGER READS MARKUP (09/11/2026: « il faut qu'elle soit agnostique », option « texte bloc par bloc »).
 *
 * The conservation check used to take the Confluence storage XHTML and parse it — it knew `ac:link`, `ac:parameter`,
 * `ac:adf-attribute`, `ac:adf-parameter`, `ac:adf-parameter-value`. A reading library that imposes its caller's publishing
 * dialect is not agnostic, so the contract moves: the CALLER hands the text it published, **block by block**, and the check
 * never sees a tag. Whoever publishes to something other than Confluence gives the same shape and gets the same verdict.
 *
 * What a block is, and why the caller decides it: a block is a run of text no word can cross — a paragraph, a heading, a
 * cell, a list item. The caller knows that about its own render; the library cannot guess it from a string. The caller also
 * hands `extras`, the numbers its destination will DRAW but does not store (Confluence draws them in front of each `<ol>`
 * item), because an extra may absorb a source word and must never count as invented text.
 *
 * What is NOT in this contract, deliberately: byte offsets. They are what the three repairs need to rewrite the page in
 * place (`glued-word-repair.ts`, `lost-text-repair.ts`, `cut-paragraph-repair.ts`), and they only exist in a markup the
 * library no longer knows. They stay with the caller, and so do the repairs.
 *
 * Run: npx vitest run --project=main src/pipeline/text-conservation.published-page.test.ts
 */

import { describe, expect, it } from "vitest";

import { pageWordsOfPublished, textConservation, type ConservationRun, type PublishedPage } from "./text-conservation";

/** One run per line, each ending its line — the simplest geometry there is (as `text-conservation.test.ts`). */
const lines = (...texts: string[]): ConservationRun[] =>
  texts.map((text, i) => ({ text, x: 0, y: 800 - 20 * i, width: 10 * text.length, fontSize: 10, hasEOL: true }));

const page = (...blocks: string[]): PublishedPage => ({ blocks });

describe("pageWordsOfPublished — the text of each block becomes located words, with no markup anywhere", () => {
  it("numbers the words block by block, as `PageWordAt` has always done", () => {
    const { body } = pageWordsOfPublished(page("Bonjour le monde", "Deuxième bloc"));
    expect(body.map((w) => w.key)).toEqual(["bonjour", "le", "monde", "deuxième", "bloc"]);
    expect(body.map((w) => w.at)).toEqual([
      { block: 0, word: 0 },
      { block: 0, word: 1 },
      { block: 0, word: 2 },
      { block: 1, word: 0 },
      { block: 1, word: 1 },
    ]);
  });

  it("a block with no word takes no block number: the numbering follows the words, not the caller's list", () => {
    // A caller that hands an empty cell or a picture-only paragraph must not shift every later index by one.
    const { body } = pageWordsOfPublished(page("premier", "   ", "", "second"));
    expect(body.map((w) => w.at.block)).toEqual([0, 1]);
  });

  it("carries the caller's extras through untouched", () => {
    expect(pageWordsOfPublished({ blocks: ["item"], extras: ["1", "2"] }).extras).toEqual(["1", "2"]);
    expect(pageWordsOfPublished(page("item")).extras).toEqual([]);
  });

  it("a tag the caller left in its text is TEXT, never a tag: the library has stopped parsing", () => {
    // The words are split on SPACES, then normalised (`conservationKey` drops what is neither letter nor digit), so the
    // characters of a tag merge into the word beside them: `<p>not` gives « pnot ». That is the proof we no longer parse —
    // the markup reading would have DROPPED `<p>` and `</p>` and read « not a tag ».
    const { body } = pageWordsOfPublished(page("<p>not a tag</p>"));
    expect(body.map((w) => w.key)).toEqual(["pnot", "a", "tagp"]);
  });
});

describe("textConservation — the same verdicts as before, from text alone", () => {
  it("every word published: ok", () => {
    expect(textConservation([lines("Bonjour le monde")], page("Bonjour le monde")).decision).toBe("ok");
  });

  it("a word missing from the page: lost, and the word is named", () => {
    // Failure value: « ok » on a page that dropped « monde ».
    const v = textConservation([lines("Bonjour le monde")], page("Bonjour le"));
    expect(v.decision).toBe("lost");
  });

  it("two words glued on the page: glued, never lost", () => {
    expect(textConservation([lines("ab cd")], page("abcd")).decision).toBe("glued");
  });

  it("a word split across two BLOCKS is not a re-spacing, the letters still cover it: glued", () => {
    // The rule `text-conservation.test.ts` pins on the XHTML path, held here on the block path: a split is proved
    // inside ONE block only, and the two blocks come from the caller, not from a `<p>` the library found.
    const v = textConservation([lines("abcd")], page("ab", "cd"));
    expect(v).toMatchObject({ decision: "glued", rule: "letters-cover-unmatched-words", respacings: [] });
  });

  it("an excluded page is not read on the source side either", () => {
    const v = textConservation([lines("Bonjour"), lines("Couche OCR invisible")], page("Bonjour"), {
      excludedPages: new Set([1]),
    });
    expect(v.decision).toBe("ok");
  });

  it("an extra absorbs the source word it stands for: ok, and it is never invented text", () => {
    // Confluence draws « 1. » in front of an ordered item: the source says « 1 », the stored page does not.
    const v = textConservation([lines("1 Introduction")], { blocks: ["Introduction"], extras: ["1"] });
    expect(v.decision).toBe("ok");
  });
});
