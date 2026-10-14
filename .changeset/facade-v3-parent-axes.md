---
"@platforma-open/milaboratories.xsv-import": minor
"@platforma-open/milaboratories.xsv-import.model": minor
"@platforma-open/milaboratories.xsv-import.ui": minor
"@platforma-open/milaboratories.xsv-import.workflow": minor
---

Rebuild on the canonical block structure: slim facade package (`dist` + `block-pack`, so the published package is no longer empty), a `kind` package, and the model moved to BlockModelV3 (persisted state kept via the legacy upgrader; UI bindings on `app.model.data`). The workflow now honours a column's `parentAxes`: such a column is imported over that subset of the declared axes, so one block can publish a sample-level anchor next to per-key properties. Rows are reduced to one per key for such a column (a per-key value repeated on every sample row is read once), a column with its own `filterOutRegex` is imported on its own so the filter affects that column alone, and `partitionKeyLength` counts only the group's leading declared axes.
