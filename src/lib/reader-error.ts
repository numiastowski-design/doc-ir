/** The ONE failure the reading library throws: a code from a closed list, a message composed by us, and — for a PDF refusal — the
 *  two page counts as structured fields, so no caller ever parses the message. A LEAF module: it imports nothing.
 *  Decides: which codes a reading may end with (the nine below, nothing else), and that a failure of a FOREIGN service the reading
 *  calls (the optional OCR) travels as `cause`, unread: the library does not interpret it, whoever called the reading may.
 *  NOT here: what a code means to the product (retry, dead letter, wording: `core/errors.ts`), nor the conversion to the app's
 *  `AppError` (`core/reader-bridge.ts`, which fails to compile if a code here is not an `ErrorCode` there).
 *  Called by: every reader that refuses a file (`extractor/`, `pipeline/source-reading-package.ts`), and `core/reader-bridge.ts`. */

/** The closed list, in one array so a test reads the same words the type is made of. */
export const READER_ERROR_CODES = [
  "EXTRACT_FAILED",
  "FILE_UNSAFE",
  "UNSUPPORTED_TYPE",
  "DOCUMENT_PASSWORD_PROTECTED",
  "DOCUMENT_TOO_MANY_PAGES",
  "SCANNED_PDF_NEEDS_AI_OCR",
  "OCR_LOW_CONFIDENCE",
  "NO_PUBLISHABLE_SHEET",
  "UNKNOWN",
] as const;

export type ReaderErrorCode = (typeof READER_ERROR_CODES)[number];

/** The numbers a PDF refusal carries: `scannedPageCount` is the pages to read (all of them for a scan); absent when the refusal came
 *  before anything was read (the page-count cap). */
export interface ReaderCountDetail {
  pageCount?: number;
  scannedPageCount?: number;
}

/** THE MARK EVERY COPY OF THE CLASS SHARES (step 8, lot 4, 20/11/2026; `corpus-local/decoupe/plan-etape-8.md` §8.1).
 *  `Symbol.for` returns the same symbol to every module of a process that asks for this key, so two installed copies of
 *  `doc-ir` — the day the two readers depend on two of its minors — still recognise each other's refusals. */
const READER_ERROR_MARK: unique symbol = Symbol.for("doc-ir/ReaderError");

export class ReaderError extends Error {
  readonly pageCount?: number;
  readonly scannedPageCount?: number;

  /** `error instanceof ReaderError` answers by the mark, not by the prototype chain, so that a refusal made by another
   *  copy of this module is one. A subclass (`PdfObjectsRefusal`…) keeps the ordinary test: a ReaderError is not one of
   *  its subclasses. The mark sits on the prototype, as a getter written in the class body: no own property on an
   *  instance, and no statement at the module's top level, which keeps the base free of side effects. */
  static override [Symbol.hasInstance](value: unknown): boolean {
    // A subclass inherits this method without owning it. The class is not named here: a class that names itself in a
    // static member is renamed `_ReaderError` by esbuild, and its `constructor.name` with it (seen on 20/11/2026).
    if (!Object.hasOwn(this, Symbol.hasInstance)) return Function.prototype[Symbol.hasInstance].call(this, value);
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { [READER_ERROR_MARK]?: unknown })[READER_ERROR_MARK] === true
    );
  }

  get [READER_ERROR_MARK](): true {
    return true;
  }

  /** `options.cause`: what a foreign service threw (the library's `UNKNOWN` « the AI reading failed »). Never part of the message. */
  constructor(
    public readonly code: ReaderErrorCode,
    message: string,
    detail?: ReaderCountDetail,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ReaderError";
    if (detail?.pageCount !== undefined) this.pageCount = detail.pageCount;
    if (detail?.scannedPageCount !== undefined) this.scannedPageCount = detail.scannedPageCount;
  }
}
