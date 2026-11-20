/**
 * The verdicts of `textConservation`, on hand-written runs against hand-written published pages. Every case states the
 * value a broken reading would give, and the fixture is built so that value differs from the expected one.
 *
 * Holds: the verdict and what it carries (margin, lost letters, glued words, located re-spacings, the source word of
 * each page word), what counts as a correct join, what the source side does not count (excluded pages, deliberate
 * removals), the drawn numbers a page hands as `extras`, and the two word helpers `lostWords` and `wordKeysOf`.
 *
 * Each page is a `PublishedPage` written by hand: the text of each block, and the numbers the destination draws.
 * No markup is read anywhere in this file.
 *
 * NOT here: how a destination's markup becomes blocks (where a block ends, what is scaffolding rather than page text,
 * which numbers are drawn). That is the caller's reader, and its tests stay beside it. The shape of the page itself is
 * held by `text-conservation.published-page.test.ts`.
 */
import { describe, expect, it } from "vitest";

import {
  lostWords,
  textConservation,
  wordKeysOf,
  type ConservationOptions,
  type ConservationRun,
  type PublishedPage,
} from "./text-conservation";

/** One run per line, each ending its line — the simplest geometry there is. */
const lines = (...texts: string[]): ConservationRun[] =>
  texts.map((text, i) => ({ text, x: 0, y: 800 - 20 * i, width: 10 * text.length, fontSize: 10, hasEOL: true }));

/** A published page of plain blocks, one per argument, with no drawn number. */
const page = (...blocks: string[]): PublishedPage => ({ blocks, extras: [] });

const check = (runs: ConservationRun[], published: PublishedPage, options: ConservationOptions = {}) =>
  textConservation([runs], published, options);

describe("textConservation — the verdict", () => {
  it("a render carrying every word is ok, with a zero margin", () => {
    const v = check(lines("Le chat dort.", "Il fait beau."), page("Le chat dort.", "Il fait beau."));
    expect(v).toEqual({
      decision: "ok",
      rule: "all-words-found",
      margin: 0,
      lostLetters: 0,
      gluedWords: 0,
      pages: [],
      unmatchedPageWords: 0,
      respacings: [],
      sourceLetters: 20,
      lostPassages: [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest types its asymmetric matcher `expect.any` as `any`.
      sourceOfPageWords: expect.any(Array),
    });
  });

  it("each page word says which source word it was matched to, and at which size (lot 35)", () => {
    // Two lines set in two sizes, the second block's word matched to the third
    // source word. Failure value: an index of -1, or one size for all.
    const runs = [
      { text: "Le chat", x: 0, y: 800, width: 70, fontSize: 10, hasEOL: true },
      { text: "dort", x: 0, y: 780, width: 40, fontSize: 16, hasEOL: true },
    ];
    const v = check(runs, page("Le chat", "dort"));
    expect(v.sourceOfPageWords).toEqual([
      [
        { index: 0, firstSize: 10, lastSize: 10 },
        { index: 1, firstSize: 10, lastSize: 10 },
      ],
      [{ index: 2, firstSize: 16, lastSize: 16 }],
    ]);
  });

  it("a page word the PDF never had is linked to no source word (lot 35)", () => {
    const v = check(lines("Le chat dort."), page("Le chat intrus dort."));
    expect(v.sourceOfPageWords[0]).toEqual([
      { index: 0, firstSize: 10, lastSize: 10 },
      { index: 1, firstSize: 10, lastSize: 10 },
      null,
      { index: 2, firstSize: 10, lastSize: 10 },
    ]);
  });

  it("a paragraph missing from the render is lost, counted in letters and located by page", () => {
    // Failure value: « ok » — a reading that matched loosely would find nothing missing.
    const v = check(lines("Le chat dort.", "Un paragraphe entier disparu."), page("Le chat dort."));
    expect(v.decision).toBe("lost");
    expect(v.rule).toBe("letters-missing");
    expect(v.lostLetters).toBe("unparagrapheentierdisparu".length);
    expect(v.margin).toBe(v.lostLetters);
    expect(v.pages).toEqual([1]);
  });

  it("two source words published as one are glued, never lost", () => {
    const v = check(lines("une fois l’application ouverte"), page("une foisl'application ouverte"));
    expect(v.decision).toBe("glued");
    expect(v.rule).toBe("respaced-words");
    expect(v.lostLetters).toBe(0);
    expect(v.gluedWords).toBe(1);
  });

  it("a glued finding carries what a repair needs: where the page token is, and the source word boundaries", () => {
    // Block 0 is the page's only block, word 1 its second token.
    const v = check(lines("une fois l’application ouverte"), page("une foisl'application ouverte"));
    expect(v.respacings).toEqual([
      { kind: "glued", page: 1, pageWords: [{ block: 0, word: 1 }], sourceWords: ["fois", "l’application"] },
    ]);
  });

  it("one source word published as two is glued too (split)", () => {
    const v = check(lines("ouvrir l'application"), page("ouvrir l'appli cation"));
    expect(v.decision).toBe("glued");
    expect(v.gluedWords).toBe(1);
  });

  it("an unmatched source word whose letters the page still carries elsewhere is glued, not lost", () => {
    // « tsoc » is nowhere as a word, but its letters sit in the page's
    // leftover « cost » — the letter reading covers it.
    const v = check(lines("prix tsoc"), page("prix cost"));
    expect(v.decision).toBe("glued");
    expect(v.rule).toBe("letters-cover-unmatched-words");
    expect(v.lostLetters).toBe(0);
  });

  it("the two readings disagreeing is an abstention, not a guess", () => {
    // « cd ef » is explained by the page's « cdef » (word reading), but « dc »,
    // earlier in the document, already took the letters c and d (letter
    // reading): which of the two survived cannot be told.
    const v = check(lines("xx dc yy", "cd ef zz"), page("xx yy cdef zz"));
    expect(v.decision).toBe("abstain");
    expect(v.rule).toBe("readings-disagree");
  });
});

describe("textConservation — what the page side does not count", () => {
  it("ordered-list numbers absorb source words without ever being invented", () => {
    // Two list items, and the numbers the destination draws in front of them, handed as extras.
    const published: PublishedPage = { blocks: ["Premier point", "Second point"], extras: ["1", "2"] };
    // Failure value: « lost » (1, 2 unmatched).
    const v = check(lines("1. Premier point", "2. Second point"), published);
    expect(v.decision).toBe("ok");
  });
});

describe("textConservation — what counts as a correct join", () => {
  it("a ligature is the letters it stands for (NFKC)", () => {
    expect(check(lines("le ﬁnancement"), page("le financement")).decision).toBe("ok");
  });

  it("a line-end hyphenation rejoined is correct, not glued", () => {
    // Failure value: « glued » with one word.
    const v = check(lines("un exem-", "ple simple"), page("un exemple simple"));
    expect(v).toMatchObject({ decision: "ok", gluedWords: 0 });
  });

  it("a letter-spaced title rejoined is correct", () => {
    expect(check(lines("L I V R E T"), page("LIVRET"))).toMatchObject({ decision: "ok", gluedWords: 0 });
  });

  it("ideographic text rejoined is correct", () => {
    expect(check(lines("日本 語"), page("日本語"))).toMatchObject({ decision: "ok", gluedWords: 0 });
  });

  it("two runs on one baseline with no gap form one word (the source reading is geometric)", () => {
    const runs: ConservationRun[] = [
      { text: "exem", x: 0, y: 700, width: 20, fontSize: 10, hasEOL: false },
      { text: "ple", x: 20.2, y: 700, width: 15, fontSize: 10, hasEOL: true },
    ];
    // Failure value: « glued » — a reading that always put a space would see « exem » + « ple ».
    expect(check(runs, page("exemple"))).toMatchObject({ decision: "ok", gluedWords: 0 });
  });

  it("two blocks never glue their edge words together", () => {
    const v = check(lines("ab cd"), page("ab", "cd"));
    expect(v.decision).toBe("ok");
    // A split is proved inside ONE block only: « ab » + « cd » across two
    // blocks is not a word-reading re-spacing. Its letters still cover
    // « abcd », so it is glued by the letter rule — failure value « ok ».
    const glued = check(lines("abcd"), page("ab", "cd"));
    expect(glued).toMatchObject({ decision: "glued", rule: "letters-cover-unmatched-words", respacings: [] });
  });
});

describe("textConservation — what the source side does not count", () => {
  it("excluded pages (scanned, OCR layer) are not read", () => {
    const v = textConservation([lines("Bonjour"), lines("Couche OCR invisible")], page("Bonjour"), {
      excludedPages: new Set([1]),
    });
    expect(v.decision).toBe("ok");
  });

  it("a lost word is located on its own page, 1-based", () => {
    const v = textConservation([lines("Bonjour"), lines("Disparu")], page("Bonjour"));
    expect(v).toMatchObject({ decision: "lost", pages: [2], lostLetters: 7 });
  });

  it("a deliberate removal absorbs the words it names", () => {
    const runs = lines("Bonjour", "Entête répété");
    expect(check(runs, page("Bonjour"), { deliberateRemovals: ["Entête répété"] }).decision).toBe("ok");
    expect(check(runs, page("Bonjour")).decision).toBe("lost");
  });

  it("a deliberate removal absorbs only as many copies as it recorded: a further lost copy stays lost", () => {
    // Three paintings of a merged header, one published (a single header cell), ONE recorded removal:
    // the third copy is a real loss. Failure value: « ok », which a removal
    // absorbing every occurrence of its words would give.
    const runs = lines("Moyennes", "Moyennes", "Moyennes");
    const v = check(runs, page("Moyennes"), {
      deliberateRemovals: ["Moyennes"],
    });
    expect(v).toMatchObject({ decision: "lost", lostLetters: "moyennes".length });
    // Recording both removed copies accounts for all three.
    expect(
      check(runs, page("Moyennes"), {
        deliberateRemovals: ["Moyennes", "Moyennes"],
      }).decision,
    ).toBe("ok");
  });
});

describe("lostWords — lot C addendum: the lost words themselves, normalised", () => {
  it("reads the words of every lost passage, key-normalised like the rest of the check", () => {
    const v = check(lines("Le CHAT dort.", "Un paragraphe entier disparu.", "Fin."), page("Le CHAT dort.", "Fin."));
    expect(v.decision).toBe("lost");
    expect(lostWords(v)).toEqual(["un", "paragraphe", "entier", "disparu"]);
  });

  it("empty when nothing is lost", () => {
    const v = check(lines("Le chat dort."), page("Le chat dort."));
    expect(lostWords(v)).toEqual([]);
  });
});

describe("wordKeysOf", () => {
  it("splits on any white space (no-break space included) and keeps one key per word", () => {
    expect(wordKeysOf("  Été déjà \t là\n")).toEqual(["été", "déjà", "là"]);
  });

  it("ignores a token with no letter or digit", () => {
    expect(wordKeysOf("a - , 42 … b")).toEqual(["a", "42", "b"]);
    expect(wordKeysOf("— ;")).toEqual([]);
  });
});
