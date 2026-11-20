# doc-ir

The common shape of a read document, and the check that says no word was lost on the way.

The base of the two readers of [Miksumia Publisher](https://miksumia.com):
[pdf-skryba](https://www.npmjs.com/package/pdf-skryba) reads a PDF,
[docs-scribe](https://www.npmjs.com/package/docs-scribe) reads Word, PowerPoint, Excel and Google
exports. Both hand back the same representation, defined here.

## Who it is for

- **You use a reader.** You do not need to install this package: each reader re-exports the names
  below from its own `light` entry, and installs `doc-ir` as a dependency.
- **You write code that takes the output of both readers.** Import the types from here, so that
  one function accepts a document whichever reader produced it.
- **You only check a published text against its source.** `textConservation` lives here and loads
  no reader.

## Install

To be completed at step 4 of the release plan (the package is not published yet; the supported
Node.js versions are announced with its first version).

## A minimal example

```ts
import { lostWords, textConservation } from "doc-ir";

// The source: one array of text runs per page, each with its place on the page.
const run = (text: string, y: number) => ({ text, x: 72, y, width: 200, fontSize: 11, hasEOL: true });
const source = [[run("Quarterly report", 700), run("Revenue grew by four percent.", 680)]];

// What you published, as plain text, block by block. No markup ever reaches the check.
const verdict = textConservation(source, { blocks: ["Quarterly report"] });

console.log(verdict.decision); // "lost"
console.log(lostWords(verdict)); // the source words the published text lacks
```

## Entries

Five entries. Two are a public promise; three exist for named callers and promise nothing.

| Entry                        | Public API | What it holds                                                                                                                                                                                                                               |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doc-ir`                     | yes        | Loads nothing heavy. The types of the representation (`IRDoc`, `IRBlock`, `TableData`…), `ReaderError`, `MAX_PAYLOAD_BYTES`, `cutNoticeName`, and the conservation check: `textConservation`, `lostWords`, `wordKeysOf`, `conservationKey`. |
| `doc-ir/language`            | yes        | `detectLanguage`, which comes with its language profiles. Kept apart so that the entry above stays light.                                                                                                                                   |
| `doc-ir/internal`            | no         | The plumbing the two readers share. Reserved to `pdf-skryba` and `docs-scribe`.                                                                                                                                                             |
| `doc-ir/first-party`         | no         | Reserved to the publisher's own application.                                                                                                                                                                                                |
| `doc-ir/first-party/browser` | no         | The same, for code that runs in a browser.                                                                                                                                                                                                  |

A public entry holds only names that a reader already hands to its own callers: this package
adds no promise of its own, it is where those names are defined.

The complete list of names of each entry is to be completed at step 4 of the release plan, from the
built package.

### Entries that are not a public API

`doc-ir/internal`, `doc-ir/first-party` and `doc-ir/first-party/browser` are not a public API. They
may change or disappear in any version, and they are outside the versioning rule that protects
callers of the public entries. The source is open, so nothing stops you from importing them: if
you do, pin an exact version.

## Versioning

While the version is `0.x`, **any breaking change, in any entry — the three non-public ones
included — raises the minor version**, and a patch never breaks anything. The two readers depend
on `doc-ir` with a caret range, so in `0.x` they only ever receive patches; after a new minor,
both readers are released the same day on the new range.

Each release is described in `CHANGELOG.md` (to be completed at step 4 of the release plan).

## Prior work

Side Liu, Jiangpeng Liu, Jinwen Xin, Guojun Peng and Jiang Ming, **"Beyond the Editing Canvas:
Evidence Divergence in OOXML-to-LLM Ingestion"**, arXiv:2608.25880 —
<https://arxiv.org/abs/2608.25880>. Its lesson is why the readers and this check exist: the
extraction path, not the model, decides what a language model sees of a document.

## Contributing and security

See `CONTRIBUTING.md` and `SECURITY.md`. A contribution is received under the MIT licence of the
repository.

## Licence

MIT (`LICENSE`), from its first version, 0.1.0. The readers built on it were under AGPL-3.0-or-later
up to `pdf-skryba` 0.8.0 and `docs-scribe` 0.5.0. One table comes from third parties, under their
own notices (`THIRD-PARTY.md`). The test documents of the repository are not under the MIT licence:
each keeps its own, written in `fixtures/**/SOURCES.md`. Author: Miksumia.
