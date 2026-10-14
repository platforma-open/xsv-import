import { kind } from "@platforma-open/milaboratories.xsv-import.kind";
import type {
  ImportFileHandle,
  InferHrefType,
  InferOutputsType,
  PlDataTableStateV2,
} from "@platforma-sdk/model";
import {
  BlockModelV3,
  DataModelBuilder,
  createPlDataTableStateV2,
  createPlDataTableV2,
} from "@platforma-sdk/model";
import { prepareSpec } from "./spec";
import type { Spec, SpecUI } from "./types";

export type FileExt = "csv" | "tsv";

/** What the workflow receives. */
export type BlockArgs = {
  spec: Spec;
  fileExt: FileExt;
  fileHandle: ImportFileHandle;
};

/** What the UI edits. `spec` keeps per-item UI state (`id`, `disabled`, `expanded`);
 * the args lambda projects it to the workflow's `Spec`. */
export type BlockData = {
  fileHandle?: ImportFileHandle;
  spec: SpecUI;
  tableState: PlDataTableStateV2;
};

type LegacyArgs = {
  spec?: Spec;
  fileExt?: FileExt;
  fileHandle?: ImportFileHandle;
};

type LegacyUiState = {
  spec?: SpecUI;
  fileExt?: FileExt;
  fileHandle?: ImportFileHandle;
  tableState?: PlDataTableStateV2;
};

const emptySpec = (): SpecUI => ({ axes: [], columns: [] });

const dataModel = new DataModelBuilder({ kind })
  .from<BlockData>("v1")
  .upgradeLegacy<LegacyArgs, LegacyUiState>(({ args, uiState }) => ({
    fileHandle: uiState.fileHandle ?? args.fileHandle,
    spec: uiState.spec ?? emptySpec(),
    tableState: uiState.tableState ?? createPlDataTableStateV2(),
  }))
  .init(() => ({
    spec: emptySpec(),
    tableState: createPlDataTableStateV2(),
  }));

export function fileExtOf(fileHandle: ImportFileHandle | undefined): FileExt | undefined {
  if (fileHandle === undefined) return undefined;
  if (fileHandle.includes(".csv")) return "csv";
  if (fileHandle.includes(".tsv")) return "tsv";
  return undefined;
}

export const platforma = BlockModelV3.create({ dataModel, kind })

  // File handles are bound to the machine they were picked on, and the spec
  // is authored against that file, so nothing crosses into a template.
  .templateParams(() => ({}))

  .args<BlockArgs>((data) => {
    if (data.fileHandle === undefined) throw new Error("File is required");
    const fileExt = fileExtOf(data.fileHandle);
    if (fileExt === undefined) throw new Error("File must be .csv or .tsv");
    const spec = prepareSpec(data.spec);
    if (spec.axes.length === 0) throw new Error("At least one axis is required");
    if (spec.columns.length === 0) throw new Error("At least one column is required");
    return { spec, fileExt, fileHandle: data.fileHandle };
  })

  .output("fileUploader", (ctx) => ctx.outputs?.resolve("fileUploader")?.getImportProgress())

  .outputWithStatus("filePFrame", (ctx) => {
    const pCols = ctx.outputs?.resolve("filePFrame")?.getPColumns();
    if (pCols == null) return undefined;
    return createPlDataTableV2(ctx, pCols, ctx.data.tableState);
  })

  .sections((_) => [
    { type: "link", href: "/", label: "Import" },
    { type: "link", href: "/data", label: "Data" },
  ])

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;
export type Href = InferHrefType<typeof platforma>;

export { prepareSpec } from "./spec";
export * from "./types";
