/**
 * THE ENTRY OF THE BASE RESERVED FOR THE TWO READERS: the plumbing they share and that is no public surface — the
 * shared geometry, the PNG encoder and the image headers, the traversal of the document tree, the notices and their
 * ceilings, the helpers of tables, labels and symbol fonts. NOT a promise to third parties: a name here may change or
 * leave with any version, and the readers that take it are released with the base.
 *
 * WHY ITS OWN ENTRY. The public entries (`./base-light.ts`, `./base.ts`) carry only names a reader's published door
 * already hands out, and the app's entry (`./base-first-party.ts`) is held load-free. What the readers need beyond
 * that loads the encoder (`node:zlib`), the digest (`node:crypto`) and the geometry: it goes here, and nowhere else.
 *
 * Decides: which names of the base a reader may take beyond the public ones; `src/app-library-surface.test.ts` pins
 * the list and refuses a name nobody takes.
 * NOT here: a name a public entry already exports (taken there), nor any logic — every name is re-exported from the
 * module that owns it.
 * Called by: the sources and tests of `packages/reader` and `packages/docs-scribe`.
 */

export { concatBytes, u16be, u32be } from "../extractor/bytes";
export { imageHeader, sniffImage } from "../extractor/image-format";
export { imagePixelWidth, isPng, jpegHeader } from "../extractor/image-pixel-width";
export { encodePng, encodePngDeflate } from "../extractor/png";
export type { PixelFormat } from "../extractor/png";
export { channelsOfColorType, hasAlphaChannel } from "../extractor/png-color";
export { unfilterPngRows } from "../extractor/png-unfilter";
export type { RawImage } from "../extractor/raw-image";
export type {
  CellAssignment,
  CellRect,
  ClassifiedLine,
  Fragment,
  LineSegment,
  Matrix2D,
  MergeMap,
  MergedCell,
  TableGrid,
} from "../layout/geometry-types";
export { buildMergeMap } from "../layout/merge-map";
export {
  IDENTITY_MATRIX,
  applyMatrix,
  classifyLineSegment,
  composeMatrix,
  positionKey,
  splitByOrientation,
  subpathsToSegments,
  translateMatrix,
} from "../layout/painted-paths";
export { distanceToPoint, fromBox, outlineDistance } from "../layout/rect";
export type { Rect } from "../layout/rect";
export {
  RECT_RULES,
  holdsPoint,
  holdsRect,
  rawFromBox,
  rawFromCell,
  rawFromEdges,
  rawFromXywh,
} from "../layout/rect-rules";
export { collapseBlanks } from "./blanks";
export { byCodeUnit } from "./code-unit-order";
export { sha256Hex } from "./digest";
export { DIAGRAM_TEXT_SEPARATOR, INTERNAL_HREF_FORM, diagramParagraphs, emptyTabBlocks, joinedInlines } from "./ir";
export type { BlockAlign, ChartAxis, ChartDrawingType, DiagramRelation, DiagramTextSection, IRTable } from "./ir";
export { mapBlockChildren, mapInlines, walkBlocks, walkInlines } from "./ir-walk";
export { resolveLabels } from "./page-labels";
export type { PageLabels } from "./page-labels";
export {
  MAX_CHART_CELLS,
  MAX_CHART_LEVELS,
  MAX_CHART_POINTS,
  MAX_CHART_SERIES,
  MAX_NOTICE_IMAGE_PLACES,
  MAX_NOTICE_PAGE_RANGES,
  MAX_NOTICE_SHEET_NAMES,
  MAX_NOTICE_SHEET_NAME_CHARS,
  NO_CAP,
  sheetUnreadableNotice,
  unpublishedPartNotices,
  workbookCapNotice,
} from "./reader-limits";
export type { PdfToolLabel } from "./reader-types";
export { isSymbolFont, symbolFontText } from "./symbol-font";
export { anchorsOf, hasContent, rowsBelow, spanOf, tableGridWidth, withoutEmptyTableParts } from "./table-empty-parts";
export { tableExceedsCaps, withholdOversizedTables } from "./table-width-cap";
export type { BinaryRef } from "./vision-port";
export { detectLanguageFromSample } from "../pipeline/detect-language";
