export { prepareSpec } from "@platforma-open/milaboratories.xsv-import.model";
import type { ColumnSpecParamUI, SpecUI } from "@platforma-open/milaboratories.xsv-import.model";
import { type XsvMetadata } from "../hooks/useMetadataXsv";
import type { ValueType } from "../types/spec";

export function autoFillSpecFromMetadata(metadata: XsvMetadata, existingSpec: SpecUI): SpecUI {
  existingSpec.axes.length = 0;
  existingSpec.columns.length = 0;

  addAllColumns(metadata, existingSpec.columns);

  if (
    metadata.header.length > 0 &&
    existingSpec.axes.length === 0 &&
    metadata.firstPossibleAxis != null
  ) {
    existingSpec.axes.push({
      id: crypto.randomUUID(),
      expanded: false,
      disabled: false,
      payload: {
        column: metadata.firstPossibleAxis,
        allowNA: false,
        spec: {
          type: metadata.types[metadata.firstPossibleAxis] ?? "String",
          name: metadata.firstPossibleAxis,
        },
      },
    });
  }

  return existingSpec;
}

export function addAllColumns(metadata: XsvMetadata, columnsSpecParamsUI: ColumnSpecParamUI[]) {
  return metadata.header.forEach((column) => {
    if (columnsSpecParamsUI.some((c) => c.payload.column === column)) {
      return; // Skip if column already exists
    }
    columnsSpecParamsUI.push(createColumn(column, metadata.types[column]));
  });
}

export function createColumn(
  column: string,
  valueType: undefined | ValueType,
  expanded = false,
): ColumnSpecParamUI {
  const id = crypto.randomUUID();

  return {
    id,
    expanded,
    disabled: false,
    payload: {
      id,
      column,
      spec: {
        valueType: valueType ?? ("String" as ValueType),
        name: column,
      },
    },
  };
}
