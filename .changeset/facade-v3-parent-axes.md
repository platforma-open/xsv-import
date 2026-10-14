---
"@platforma-open/milaboratories.xsv-import": minor
"@platforma-open/milaboratories.xsv-import.model": minor
"@platforma-open/milaboratories.xsv-import.ui": minor
"@platforma-open/milaboratories.xsv-import.workflow": minor
---

Rebuild on the canonical block structure: slim facade package (`dist` + `block-pack`, so the published package is no longer empty), a `kind` package, and the model moved to BlockModelV3 (persisted state kept via the legacy upgrader; UI bindings on `app.model.data`). The workflow now honours a column's `parentAxes`: such a column is imported over that subset of the declared axes, so one block can publish a sample-level anchor next to per-key properties. `partitionKeyLength` counts only the group's leading declared axes.
