/** The language a document is written in, decided locally and deterministically
 *  — sampling windows of prose, scoring them against the profiles, and
 *  abstaining when the margin is too thin.
 *  NOT here: the per-language data (`pipeline/language-profiles.ts`), what
 *  « same language » means (`core/language.ts`), nor the decision to translate
 *  (`core/state-machine.ts#shouldTranslate`).
 *  Called by: `orchestrator/doc-processor.ts`. */

/**
 * Why local rather than a model call: detection exists to avoid sending away a document already written in the
 * reference language, and paying a call to learn that none is needed would cancel the gain.
 *
 * The imprecision falls on the safe side. Too short a text, a numeric sheet, a balanced bilingual document, a language
 * missing from the table: the answer is `undefined`, which means « do not translate ». The heuristic abstains instead
 * of guessing, so it cannot cause a document to be rewritten that did not need it.
 *
 * The result stays a return value and is never written on the `IRDoc`: any field added there is one refactor away from
 * entering the content hash, which would republish every document.
 */

import { diagramParagraphs, type IRBlock, type IRDoc } from "../lib/ir";
import { walkBlocks } from "../lib/ir-walk";
import { FUNCTION_WORD_SETS, SCRIPT_PROFILES } from "./language-profiles";

// Thresholds: starting values to calibrate. The tests pin the behaviour they command (below the floor, `undefined`),
// never an accuracy rate: the test texts are hand-written and cannot measure one.

/** One sampling window. */
const WINDOW_CHARS = 700;

/** Start, middle, end. The head alone would be a trap: a cover page or a header in another language would decide for
 *  the whole document. */
const WINDOW_COUNT = 3;

/** Below this much prose, abstain. */
export const MIN_SAMPLE_CHARS = 200;

/** The same floor in alphabetic tokens, the one that catches a spreadsheet: rows of digits give many characters and
 *  almost no word. */
export const MIN_ALPHA_TOKENS = 40;

/** The best score must be at least this share of the tokens. Below it no language recognises the text: jargon, a list
 *  of proper names, or a language missing from the table. */
const MIN_SCORE_RATIO = 0.15;

/**
 * The best score must also beat the second by this factor. This rule, not the disjoint word sets, protects close
 * languages.
 *
 * Starting value to calibrate. A bilingual document and two close languages are the same phenomenon, two languages
 * with neighbouring scores, and the right answer is the same for both: abstain. The threshold only places the limit.
 * At 1.25 a half-French half-English text passed as English; at 1.5 it abstains. Accepted cost: Danish and Norwegian
 * abstain against each other, and Portuguese sits barely above the threshold.
 */
export const MIN_MARGIN_FACTOR = 1.5;

/** Share of the letters a script must hold to decide alone: a Japanese document full of Latin terms passes, a Greek
 *  quote in a French text does not. */
const MIN_SCRIPT_RATIO = 0.2;

/** Table cells are left out on purpose: short and often numeric, they would raise the character count without adding
 *  function words, and carry a spreadsheet over the floor. `equation.text` is left out for the same reason. */
function collectProse(blocks: readonly IRBlock[], out: string[]): void {
  walkBlocks(blocks, (block) => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        out.push(block.inlines.map((i) => i.text).join(""));
        break;
      // The sections' text only: a label is ours, not the document's prose.
      case "diagramText":
        // One entry per paragraph (`breaks`), never joined across a break:
        // the last word of a chain and the first of the next would glue.
        for (const section of block.sections) {
          for (const paragraph of diagramParagraphs(section)) out.push(paragraph.map((i) => i.text).join(""));
        }
        break;
      case "section":
        if (block.title !== undefined) out.push(block.title);
        break;
      case "chart":
        if (block.title !== undefined) out.push(block.title);
        out.push(...(block.axisTitles ?? []).map((t) => t.text));
        break;
      // Containers: `walkBlocks` enters them (a tab's label is ours, "Slide N": only its content is prose).
      case "list":
      case "footnote":
      case "columns":
      case "tabs":
      case "toc":
      case "image": // no text of its own (no image goes to vision)
        break;
      case "table":
      case "equation":
        // Deliberately not entered (see the comment above).
        return false;
      default: {
        // A new block kind must be decided here, never ignored silently.
        const unhandled: never = block;
        return unhandled;
      }
    }
  });
}

export function collectProseText(doc: IRDoc): string {
  const parts: string[] = [];
  collectProse(doc.blocks, parts);
  return parts.filter((p) => p.length > 0).join("\n");
}

/** The three windows, or the whole text when it is shorter than their sum. */
export function buildDetectionSample(doc: IRDoc): string {
  const text = collectProseText(doc);
  const total = WINDOW_CHARS * WINDOW_COUNT;
  if (text.length <= total) return text;
  const middleStart = Math.floor((text.length - WINDOW_CHARS) / 2);
  return [
    text.slice(0, WINDOW_CHARS),
    text.slice(middleStart, middleStart + WINDOW_CHARS),
    text.slice(text.length - WINDOW_CHARS),
  ].join(" ");
}

/** Cuts on every non-alphabetic boundary, apostrophes included: no numeric token survives, and an elided form gives
 *  its one-letter article as a token of its own, which the profiles count. */
export function tokenize(sample: string): string[] {
  return sample
    .toLowerCase()
    .split(/[^\p{L}\p{M}]+/u)
    .filter((t) => t.length > 0);
}

function detectByScript(sample: string): string | undefined {
  const letters = sample.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return undefined;
  for (const { lang, pattern } of SCRIPT_PROFILES) {
    // `matchAll`, not `pattern.test`: a `/g` literal carries a mutable `lastIndex`, and this table is shared at module
    // level, so `test` would answer from the previous call.
    const count = [...sample.matchAll(pattern)].length;
    if (count / letters >= MIN_SCRIPT_RATIO) return lang;
  }
  return undefined;
}

/** The full ranking, by decreasing score; a tie is broken by language code so that equal scores stay deterministic. */
export function scoreLanguages(tokens: readonly string[]): { lang: string; score: number }[] {
  if (tokens.length === 0) return [];
  return FUNCTION_WORD_SETS.map(({ lang, words }) => {
    let hits = 0;
    for (const token of tokens) if (words.has(token)) hits += 1;
    return { lang, score: hits / tokens.length };
  }).sort((a, b) => (b.score !== a.score ? b.score - a.score : a.lang < b.lang ? -1 : 1));
}

/** Detection on a sample already built. */
export function detectLanguageFromSample(sample: string): string | undefined {
  const byScript = detectByScript(sample);
  if (byScript !== undefined) return byScript;

  if (sample.length < MIN_SAMPLE_CHARS) return undefined;

  const tokens = tokenize(sample);
  if (tokens.length < MIN_ALPHA_TOKENS) return undefined;

  const ranked = scoreLanguages(tokens);
  const best = ranked[0];
  if (!best || best.score < MIN_SCORE_RATIO) return undefined;

  const second = ranked[1];
  if (second && second.score > 0 && best.score < second.score * MIN_MARGIN_FACTOR) return undefined;

  return best.lang;
}

/** The document's dominant language, in BCP-47, or `undefined`. No default language ever replaces `undefined`: it
 *  would have every document the heuristic cannot read translated blindly. */
export function detectLanguage(doc: IRDoc): string | undefined {
  return detectLanguageFromSample(buildDetectionSample(doc));
}
