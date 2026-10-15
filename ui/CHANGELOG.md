# @platforma-open/milaboratories.xsv-import.ui

## 2.0.0

### Major Changes

- 326742b: Rebuild on the canonical block structure: slim facade package (`dist` + `block-pack`, so the published package is no longer empty), a `kind` package, and the model moved to BlockModelV3 (persisted state kept via the legacy upgrader; UI bindings on `app.model.data`). The workflow now honours a column's `parentAxes`: such a column is imported over that subset of the declared axes, so one block can publish a sample-level anchor next to per-key properties. Rows are reduced to one per key for such a column (a per-key value repeated on every sample row is read once) after its row filters run, so a filtered-out value never displaces a valid one; the reduction honours `commentLinePrefix` and `skipEmptyLines`, and a custom separator on such a column fails the run instead of misreading the file. A column with its own `filterOutRegex` is imported on its own so the filter affects that column alone, and `partitionKeyLength` counts only the group's leading declared axes.

### Patch Changes

- Updated dependencies [326742b]
  - @platforma-open/milaboratories.xsv-import.model@2.0.0

## 1.0.5

### Patch Changes

- b3d7157: Technical release
- Updated dependencies [b3d7157]
  - @platforma-open/milaboratories.xsv-import.model@1.0.4

## 1.0.4

### Patch Changes

- c28a38b: fix import tables with unstricted names

## 1.0.3

### Patch Changes

- 372f594: Bump
- Updated dependencies [372f594]
  - @platforma-open/milaboratories.xsv-import.model@1.0.3

## 1.0.2

### Patch Changes

- 7d7e0f3: Correct support tsv and auto-detect delimiters
- Updated dependencies [7d7e0f3]
  - @platforma-open/milaboratories.xsv-import.model@1.0.2

## 1.0.1

### Patch Changes

- 00553a1: Init block
- Updated dependencies [00553a1]
  - @platforma-open/milaboratories.xsv-import.model@1.0.1
