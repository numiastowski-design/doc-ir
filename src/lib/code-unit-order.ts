/** The comparator that puts strings in UTF-16 code unit order — the order `Array.prototype.sort` gives strings with no
 *  comparator, written out: a stable order for names and tokens, the same on every machine. Never `localeCompare`, whose
 *  order depends on the locale of the runtime.
 *  A LEAF module: it imports nothing.
 *  NOT here: any order meant for a reader's eyes (alphabetical, by locale).
 *  The shared definition: the app takes it through the base's first-party entry (`lib/base-first-party.ts`). One private
 *  copy stays, in `layout/induced-markers.ts`, a file written with no import at all.
 *  Called by: `extractor/smartart.ts` of the reader package and `lib/base-first-party.ts`; two of its test supports
 *  (`extractor/jpeg/jpeg-fixtures.test.support.ts`, `extractor/xml/xml-fixtures.test.support.ts`); the app's
 *  `src/library-boundary.test.support.ts`. */
export const byCodeUnit = (left: string, right: string): number => (left < right ? -1 : Number(left > right));
