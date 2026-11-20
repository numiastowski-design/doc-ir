/** The SHA-256 hex of a text or bytes, written once.
 *  NOT here: the contents of any hash (`pipeline/content-hash.ts` decides what is hashed), nor the constant-time
 *  comparison of two secrets: a reading library has no use for a token primitive.
 *  Called by: `pipeline/content-hash.ts`, `extractor/docx-reader/` (the identity of a picture, the sum of a file). */

import { createHash } from "node:crypto";

export const sha256Hex = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");
