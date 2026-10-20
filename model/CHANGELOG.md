# @platforma-open/milaboratories.xsv-import.model

## 2.0.1

### Patch Changes

- 5181384: Release every package through npm trusted publishing (OIDC) so each package's trusted publisher is used before it expires.

## 2.0.0

### Major Changes

- 326742b: Rebuild on the canonical block structure: slim facade package (`dist` + `block-pack`, so the published package is no longer empty), a `kind` package, and the model moved to BlockModelV3 (persisted state kept via the legacy upgrader; UI bindings on `app.model.data`). The workflow now honours a column's `parentAxes`: such a column is imported over that subset of the declared axes, so one block can publish a sample-level anchor next to per-key properties. Rows are reduced to one per key for such a column (a per-key value repeated on every sample row is read once) after its row filters run, so a filtered-out value never displaces a valid one; the reduction honours `commentLinePrefix` and `skipEmptyLines`, and a custom separator on such a column fails the run instead of misreading the file. A column with its own `filterOutRegex` is imported on its own so the filter affects that column alone, and `partitionKeyLength` counts only the group's leading declared axes.

## 1.0.4

### Patch Changes

- b3d7157: Technical release

## 1.0.3

### Patch Changes

- 372f594: Bump

## 1.0.2

### Patch Changes

- 7d7e0f3: Correct support tsv and auto-detect delimiters

## 1.0.1

### Patch Changes

- 00553a1: Init block
