/**
 * THE LOAD-FREE ENTRY OF THE BASE: the document a reader hands back, what it could not publish, the reader's error and
 * limits, the vision port, and the word-conservation check with the shapes it speaks in.
 *
 * WHICH NAMES. Only names a published door of a reader already hands to third parties: the base adds no promise of its
 * own here, it is where those names are defined. `src/app-library-surface.test.ts` holds that rule name by name.
 * Importing this loads no reader, no layout and no language profile.
 *
 * Decides: which names of the base a caller may take as a public surface without loading anything heavy.
 * NOT here: the language detector, which loads its profiles (`./base.ts`); what only the publisher's own app takes
 * (`./base-first-party.ts`); any logic — every name is re-exported from the module that owns it.
 * Called by: `src/readers/light.ts`, `src/readers/dispatch.ts`, `src/readers/image.ts`.
 */

export type { PdfTableDetection, PdfTableOrigin } from "../layout/geometry-types";
export type { ChartDrawing, IRBlock, IRDoc, IRTab, ImageRef, Inline, InlineMark, TableData } from "./ir";
export type { PageLabelOverride } from "./page-labels";
export { ReaderError } from "./reader-error";
export type { ReaderCountDetail } from "./reader-error";
export { MAX_PAYLOAD_BYTES, cutNoticeName } from "./reader-limits";
export type { ReaderLimits } from "./reader-limits";
export type {
  DocumentConservation,
  DocumentNotice,
  DocumentStructure,
  MissingWordCause,
  PageLanguage,
  PdfTextUnreadReason,
  PictureRefusal,
  StructureCounts,
} from "./reader-types";
export { conservationKey, lostWords, textConservation, wordKeysOf } from "../pipeline/text-conservation";
export type {
  ConservationRule,
  ConservationRun,
  ConservationVerdict,
  LostPassage,
  PageEdit,
  PageWordAt,
  PublishedPage,
  Respacing,
  SourceWordLink,
} from "../pipeline/text-conservation";
export type { VisionPort, VisionResult } from "./vision-port";
