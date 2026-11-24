# Changelog

All notable changes to `doc-ir` are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html): while the version is `0.x`, a minor
version may break the published surface, and a patch never does. Dates are the publication dates on
the npm registry (UTC).

## [0.2.0] - 2026-11-24

### Added

- `DocumentNotice` kind `pdf-part-unread`: parts of PDF pages drawn by an object the reader could not
  read, published without it. It may break an exhaustive `switch` over the notice kinds, hence a minor version.

## [0.1.0] - 2026-11-20

### Added

- First version of the base that `pdf-skryba` and `docs-scribe` share: the representation a read
  document comes back in, and the measure that says no word was lost.

### Changed

- Licence: MIT. This code was under AGPL-3.0-or-later while it shipped inside `pdf-skryba` up to
  0.8.0 and `docs-scribe` up to 0.5.0.
