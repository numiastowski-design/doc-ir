/**
 * Properties of the language detector, true for any input.
 *
 *  - P1 determinism: two calls on the same input return the same thing; a wavering detector would flip the decision
 *    to translate between two runs on identical content.
 *  - P2 floor: below the thresholds, always `undefined`.
 *  - P3 margin: two languages within `MIN_MARGIN_FACTOR` of each other give an abstention, checked on the real
 *    ranking.
 *  - P4 window order: the dominant language does not depend on the order in which the windows are joined.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { IRDoc } from "../lib/ir";
import {
  MIN_ALPHA_TOKENS,
  MIN_MARGIN_FACTOR,
  MIN_SAMPLE_CHARS,
  detectLanguage,
  detectLanguageFromSample,
  scoreLanguages,
  tokenize,
} from "./detect-language";
import { fuzzRuns } from "../lib/fuzz-runs.test.support";

/** Any text: letters of several alphabets, digits, punctuation, spaces. No language generator: the aim is to cover
 *  what is no language. */
const CHARS = [
  ..."abcdefghijklmnopqrstuvwxyzàéèçüöäñåøßżźćłšřč ",
  ..."0123456789.,;:!?()-'\n\t",
  ..."иврэуηθλאבجدسم漢字ひらがな",
];

const arbText = fc.array(fc.constantFrom(...CHARS), { maxLength: 3000 }).map((cs) => cs.join(""));

const docOf = (text: string): IRDoc => ({ blocks: [{ kind: "paragraph", inlines: [{ text }] }] });

describe("P1 — déterminisme", () => {
  it("deux appels sur le même échantillon rendent le même résultat", () => {
    fc.assert(
      fc.property(arbText, (text) => {
        expect(detectLanguageFromSample(text)).toBe(detectLanguageFromSample(text));
      }),
      { numRuns: fuzzRuns(400, process.env) },
    );
  });

  it("le passage par un IRDoc ne change rien au verdict", () => {
    fc.assert(
      fc.property(arbText, (text) => {
        expect(detectLanguage(docOf(text))).toBe(detectLanguageFromSample(text));
      }),
      { numRuns: fuzzRuns(300, process.env) },
    );
  });

  it("les regex de script à drapeau global ne gardent pas d'état entre deux appels", () => {
    // Two scripts alternated, not one repeated: a shared `/g` pattern read with `test` would answer from the previous
    // call.
    const ja = "これは四半期報告書です。地域チームのデータを含みます。";
    const el = "Η τριμηνιαία έκθεση θα δημοσιευθεί τη Δευτέρα και πρέπει να περιλαμβάνει όλα τα στοιχεία.";
    for (let i = 0; i < 5; i++) {
      expect(detectLanguageFromSample(ja)).toBe("ja");
      expect(detectLanguageFromSample(el)).toBe("el");
    }
  });
});

describe("P2 — planchers : sous le seuil, jamais de langue", () => {
  it("un échantillon plus court que MIN_SAMPLE_CHARS ne rend jamais de langue latine ou cyrillique", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzàéèç .,"), { maxLength: MIN_SAMPLE_CHARS - 1 })
          .map((cs) => cs.join("")),
        (text) => {
          expect(detectLanguageFromSample(text)).toBeUndefined();
        },
      ),
      { numRuns: fuzzRuns(400, process.env) },
    );
  });

  it("un échantillon de moins de MIN_ALPHA_TOKENS mots ne rend jamais de langue", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("le", "the", "und", "que", "och", "и"), { maxLength: MIN_ALPHA_TOKENS - 1 }),
        (words) => {
          // Padded with one very long word: it passes the length floor and adds a single token, which isolates the
          // token floor.
          const sample = `${words.join(" ")} ${"x".repeat(MIN_SAMPLE_CHARS)}`;
          expect(sample.length).toBeGreaterThanOrEqual(MIN_SAMPLE_CHARS);
          expect(detectLanguageFromSample(sample)).toBeUndefined();
        },
      ),
      { numRuns: fuzzRuns(300, process.env) },
    );
  });
});

describe("P3 — marge : deux langues trop proches ⇒ abstention", () => {
  it("un résultat non-undefined implique une marge réellement atteinte", () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const detected = detectLanguageFromSample(text);
        if (detected === undefined) return;
        const ranked = scoreLanguages(tokenize(text));
        const best = ranked[0];
        const second = ranked[1];
        if (!best || !second || second.score === 0) return;
        // A language decided by its script bypasses the margin, on purpose.
        if (best.lang !== detected) return;
        expect(best.score).toBeGreaterThanOrEqual(second.score * MIN_MARGIN_FACTOR);
      }),
      { numRuns: fuzzRuns(500, process.env) },
    );
  });
});

describe("P4 — l'ordre des fenêtres ne change pas la langue dominante", () => {
  const FR =
    "Le rapport trimestriel sera publié lundi prochain et il devra contenir tous les chiffres qui ont été collectés auprès des équipes régionales.";
  const FR2 =
    "Si vous avez des questions sur ces données, nous pourrons en discuter pendant la réunion prévue à la fin de la semaine.";
  const FR3 =
    "Ce document est destiné à un usage interne et ne doit pas être communiqué à un partenaire extérieur sans accord préalable.";

  it("les six permutations de trois fenêtres françaises donnent toutes fr", () => {
    const windows = [FR, FR2, FR3];
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    for (const order of permutations) {
      const sample = order.map((i) => windows[i]).join(" ");
      expect(detectLanguageFromSample(sample)).toBe("fr");
    }
  });

  it("le score d'une langue ne dépend pas de l'ordre des tokens", () => {
    fc.assert(
      fc.property(arbText, fc.integer({ min: 0, max: 2 ** 31 - 1 }), (text, seed) => {
        const tokens = tokenize(text);
        // A shuffle driven by `seed`: deterministic, and replayable on a counter-example.
        const shuffled = [...tokens];
        let state = seed + 1;
        for (let i = shuffled.length - 1; i > 0; i--) {
          state = (state * 1103515245 + 12345) % 2 ** 31;
          const j = state % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }
        expect(scoreLanguages(shuffled)).toEqual(scoreLanguages(tokens));
      }),
      { numRuns: fuzzRuns(200, process.env) },
    );
  });
});
