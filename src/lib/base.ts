/**
 * THE ENTRY OF THE BASE THAT LOADS DATA: the language detector, which comes with its profiles.
 *
 * WHY IT IS NOT IN `./base-light.ts`. A caller that needs a type, a limit or the conservation check must not pay for
 * the profiles: the app's light functions take that entry and never this one.
 *
 * Decides: which names of the base a caller may take as a public surface when it accepts to load data with them.
 * NOT here: the load-free names (`./base-light.ts`), what only the publisher's own app takes
 * (`./base-first-party.ts`), nor any logic — the name is re-exported from the module that owns it.
 * Called by: `src/readers/index.ts`.
 */

export { detectLanguage } from "../pipeline/detect-language";
