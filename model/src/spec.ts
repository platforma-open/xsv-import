import type { AxisSpecParam, ColumnSpecParam, Spec, SpecUI } from "./types";

/** Project the UI's editable spec onto the workflow's import spec: drop disabled
 * items, drop empty fields, and fill `spec.name` and the label annotation. */
export function prepareSpec(spec: SpecUI): Spec {
  return withoutEmptyFields({
    ...spec,
    axes: spec.axes
      .filter((v) => !v.disabled)
      .map((v) => v.payload)
      .map(withoutEmptyFields)
      .map(propagateNames),
    columns: spec.columns
      .filter((v) => !v.disabled)
      .map((v) => v.payload)
      .map(withoutEmptyFields)
      .map(propagateNames),
  });
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function withoutEmptyFields<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => !isEmptyValue(value))) as T;
}

function propagateNames<T extends AxisSpecParam | ColumnSpecParam>(item: T): T {
  return {
    ...item,
    spec: {
      ...item.spec,
      name: item.spec.name || item.column,
      annotations: {
        ...item.spec.annotations,
        "pl7.app/label": item.spec.annotations?.["pl7.app/label"] || item.spec.name || item.column,
      },
    },
  };
}
