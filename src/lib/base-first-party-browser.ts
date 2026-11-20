/**
 * THE PART OF THE BASE A BROWSER BUNDLE MAY EMBED, first-party like `./base-first-party.ts`: the payload ceiling and
 * the page labels, and nothing that reaches a digest, a check or a traversal.
 *
 * WHY ITS OWN ENTRY. The app's dashboard embeds three of the app's modules, and whatever those import travels to the
 * browser with them. An entry that re-exported the whole base would put the conservation check and `node:crypto` in
 * that graph, kept out of the shipped bundle by the tree-shaker alone. This one reaches two leaves; the dashboard's
 * guard pins them (`src/core/import-boundaries.test.ts`).
 *
 * Decides: which names of the base a module embedded by the dashboard may take.
 * NOT here: anything else the app takes (`./base-first-party.ts`), the public names (`./base-light.ts`), nor any
 * logic — every name is re-exported from the module that owns it.
 * Called by: `src/core/page-messages.ts`, `src/orchestrator/page-cap.ts`.
 */

export type { ChartAxis } from "./ir";
export { noteCallLabel, pageLabels } from "./page-labels";
export type { PageLabels } from "./page-labels";
export { MAX_PAYLOAD_BYTES } from "./reader-limits";
