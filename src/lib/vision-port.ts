/** The contract for asking a model what an image says, DECLARED by the reading library and implemented by the app: one call per
 *  image, text extraction only — never a description. The library reads through it and never names a provider.
 *  NOT here: the model call (`vision/gemini.ts`), the fake (`vision/fake.ts`), nor the rule that drops an image with nothing
 *  readable (`extractor/pdf.ts`). `vision/port.ts` re-exports these three types, so the app keeps ONE definition, at this address.
 *  Called by: `extractor/pdf-scanned.ts` reads through it, the app's dispatch hands it one; `vision/port.ts` hands it on to the app
 *  (`vision/{gemini,fake,index}.ts` implement it, `orchestrator/doc-processor.ts` and `tools/abstention-map.ts` use it). */

/**
 * vision — port for AI image analysis (MIKSUDOC « Spécification technique » §5.5). The port is the
 * socket; only the adapter changes if the underlying model provider ever
 * changes. One call per image, a single-task prompt (text extraction only —
 * no description: an image with nothing readable is excluded from the page
 * entirely rather than described, MIKSUDOC « Spécification fonctionnelle » §6.6/§9), never a
 * network/model detail leaking into callers.
 */

import type { TableData } from "./ir";

export interface BinaryRef {
  bytes: Uint8Array;
  mimeType: string;
}

export interface VisionResult {
  /** OCR'd text, "" when the image has none (a signature, logo, stamp, or a
   *  purely graphical diagram — the "mute" case, MIKSUDOC « Spécification fonctionnelle » §6.6/§9: the
   *  image is excluded from the page entirely, never described). */
  text: string;
  /** Self-reported 0..1 confidence — Gemini has no native score, this is
   *  required in the structured JSON output itself (§5.5). */
  confidence: number;
  /** One-sentence summary, used as alt text when `text` is long (§6.6). */
  altSummary?: string;
  /** Present when the image is itself a data table/chart-like graphic. */
  structuredTables?: TableData[];
}

/** The port has no method that takes one image, on purpose: no picture of a document goes to a third party, and a
 *  capability that does not exist cannot be reached by mistake. `analyzeDocument` stays because a scanned PDF has no
 *  other text than its pixels: without it the whole document is lost to search. */
export interface VisionPort {
  /** A batch of PDF pages (MIKSUDOC « Spécification technique » §5.4: "PDF scanné/mixte |
   *  pdf-lib : découpage en lots de pages → vision (Gemini) par lots") —
   *  `doc` is itself a small PDF (a page slice, built with pdf-lib), and the
   *  result has exactly one entry per page in that slice, in page order.
   *  Gemini reads PDFs natively; no page-to-image rasterization needed. */
  analyzeDocument(doc: BinaryRef, opts?: { languages?: string[] }): Promise<VisionResult[]>;
}
