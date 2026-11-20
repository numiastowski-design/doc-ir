/**
 * THE FIRST-PARTY ENTRY OF THE BASE: what the publisher's own app takes from it beyond the public surface. NOT a
 * promise to third parties — a name here may change or leave without notice.
 *
 * WHY THESE NAMES ARE NOT IN THE APP. Each is the base's own domain and is used by the readers too: the traversal of
 * the document tree, the diagram text a block carries, the one ordering of strings, the digest, the table clean-up,
 * the letter count of the conservation check, the PNG signature test, and the shapes the app stores or renders.
 * Load-free, like `./base-light.ts`.
 *
 * Decides: which names of the base the app may take without their being public; `src/app-library-surface.test.ts`
 * pins the list and refuses a name nobody takes.
 * NOT here: the public names (`./base.ts`, `./base-light.ts`), what a browser bundle embeds
 * (`./base-first-party-browser.ts`), nor any logic — every name is re-exported from the module that owns it.
 * Called by: `src/readers/index.ts`, `src/readers/light.ts`, `src/readers/dispatch.ts`, `src/readers/image.ts`; two
 * names by the publisher's tests and tools alone — `READER_ERROR_CODES` (the test of the app's bridge walks every
 * code) and `symbolFontText` (the bench translates the page's words as the readers translate the source's).
 */

export { isPng } from "../extractor/image-pixel-width";
export type { RawImage } from "../extractor/raw-image";
export { byCodeUnit } from "./code-unit-order";
export { sha256Hex } from "./digest";
export { mapInlines, walkBlocks, walkInlines } from "./ir-walk";
export { DIAGRAM_TEXT_SEPARATOR, diagramParagraphs } from "./ir";
export type { BlockAlign, ColumnsLayout, DiagramTextSection } from "./ir";
export { READER_ERROR_CODES } from "./reader-error";
export { MAX_NOTICE_PAGE_RANGES } from "./reader-limits";
export type { PdfToolLabel } from "./reader-types";
export { symbolFontText } from "./symbol-font";
export { withoutEmptyTableParts } from "./table-empty-parts";
export { letterCounts } from "../pipeline/text-conservation";
export type { BinaryRef } from "./vision-port";
