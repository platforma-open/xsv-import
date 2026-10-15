import type { BlockData, SpecUI, platforma } from "@platforma-open/milaboratories.xsv-import.model";
import { createPlDataTableStateV2, isValueNA } from "@platforma-sdk/model";
import type { PTableHandle } from "@platforma-sdk/model";
import { blockTest } from "@platforma-sdk/test";
import type { ML, RawHelpers } from "@platforma-sdk/test";
import path from "node:path";
import { XsvImportBlockPointer } from "this-block";

const assets = path.resolve(import.meta.dirname, "../assets");

const item = <T>(payload: T) => ({
  id: crypto.randomUUID(),
  disabled: false,
  expanded: false,
  payload,
});

// A bulk VDJ dataset shape: an anchor abundance column on [sampleId, clonotypeKey] and a
// CDR3 column keyed on the clonotype axis alone (`parentAxes`), as downstream blocks expect.
export const clonotypesSpec = (): SpecUI => ({
  axes: [
    item({ column: "sampleId", spec: { name: "pl7.app/sampleId", type: "String" as const } }),
    item({
      column: "clonotypeKey",
      spec: {
        name: "pl7.app/vdj/clonotypeKey",
        type: "String" as const,
        domain: { "pl7.app/vdj/clonotypingRunId": "xsv-fixture" },
        annotations: { "pl7.app/label": "Clonotype key" },
      },
    }),
  ],
  columns: [
    item({
      column: "cellCount",
      spec: {
        name: "pl7.app/vdj/uniqueCellCount",
        valueType: "Long" as const,
        annotations: {
          "pl7.app/isAnchor": "true",
          "pl7.app/isAbundance": "true",
          "pl7.app/abundance/isPrimary": "true",
          "pl7.app/abundance/normalized": "false",
          "pl7.app/abundance/unit": "cells",
          "pl7.app/label": "Number of Cells",
        },
      },
    }),
    item({
      column: "cdr3aa",
      spec: {
        name: "pl7.app/vdj/sequence",
        valueType: "String" as const,
        parentAxes: [1],
        domain: { "pl7.app/alphabet": "aminoacid", "pl7.app/vdj/feature": "CDR3" },
        annotations: { "pl7.app/label": "CDR3 aa" },
      },
    }),
    item({
      column: "label",
      spec: {
        name: "pl7.app/label",
        valueType: "String" as const,
        parentAxes: [1],
        annotations: { "pl7.app/label": "Clonotype label" },
      },
    }),
  ],
  storageFormat: "Binary",
  partitionKeyLength: 1,
});

/**
 * Wait for a block to reach Done while keeping its state observed. The block's
 * `fileUploader` output is what starts the local-file upload, and a lazy-state
 * block renders that output only while something reads its state, so a wait on
 * the project overview alone never uploads anything.
 */
export async function awaitBlockDoneObserved(
  rawPrj: ML.Project,
  blockId: string,
  timeoutMs: number,
): Promise<void> {
  const state = rawPrj.getBlockState(blockId);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await state.getValue();
    const overview = (await rawPrj.overview.getValue())!.blocks.find((b) => b.id === blockId);
    if (overview === undefined) throw new Error(`Block not found: ${blockId}`);
    if (overview.outputErrors) {
      throw new Error(
        "Block error: " + (overview.outputsError ?? overview.exportsError ?? "no message"),
      );
    }
    if (overview.calculationStatus === "Done") return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Block ${blockId} did not reach Done within ${timeoutMs} ms`);
}

// Two samples sharing clonotype keys, with two per-clonotype columns that both filter `NA`.
// c02 is `NA` in its first row and valid in its second; c05's CDR3 is `NA` while its V gene is not.
const sharedKeysSpec = (): SpecUI => {
  const base = clonotypesSpec();
  const perClonotype = (column: string, name: string, domain: Record<string, string>) =>
    item({
      column,
      filterOutRegex: "^NA$",
      spec: { name, valueType: "String" as const, parentAxes: [1], domain },
    });
  return {
    ...base,
    columns: [
      base.columns[0],
      perClonotype("cdr3aa", "pl7.app/vdj/sequence", {
        "pl7.app/alphabet": "aminoacid",
        "pl7.app/vdj/feature": "CDR3",
      }),
      perClonotype("vGene", "pl7.app/vdj/geneHit", { "pl7.app/vdj/reference": "VGene" }),
    ],
  };
};

async function runImport(
  rawPrj: ML.Project,
  helpers: RawHelpers,
  fixture: string,
  spec: SpecUI,
): Promise<PTableHandle | undefined> {
  const blockId = await rawPrj.addBlock("CSV/TSV Import", XsvImportBlockPointer);
  const data: BlockData = {
    fileHandle: await helpers.getLocalFileHandle(path.join(assets, fixture)),
    spec,
    tableState: createPlDataTableStateV2(),
  };
  await rawPrj.mutateBlockStorage(blockId, { operation: "update-block-data", value: data });
  await rawPrj.runBlock(blockId);
  await awaitBlockDoneObserved(rawPrj, blockId, 90000);

  const state = await helpers.awaitBlockDoneAndGetStableBlockState<typeof platforma>(
    blockId,
    30000,
  );
  const table = state.outputs.filePFrame;
  if (!table.ok) throw new Error(`filePFrame output is an error: ${JSON.stringify(table.errors)}`);
  return table.value?.fullTableHandle;
}

blockTest(
  "imports a TSV and publishes its columns",
  { timeout: 120000 },
  async ({ rawPrj, helpers, expect }) => {
    const tableHandle = await runImport(rawPrj, helpers, "clonotypes.tsv", clonotypesSpec());
    expect(tableHandle).toBeDefined();
  },
);

blockTest(
  "reduces per-clonotype columns to one row per key, filtering each column alone",
  { timeout: 120000 },
  async ({ rawPrj, helpers, ml, expect }) => {
    const tableHandle = await runImport(
      rawPrj,
      helpers,
      "clonotypes-shared-keys.tsv",
      sharedKeysSpec(),
    );
    if (tableHandle === undefined) throw new Error("full table handle is undefined");

    const driver = ml.driverKit.pFrameDriver;
    const tableSpec = await driver.getSpec(tableHandle);
    const indexOf = (type: "axis" | "column", name: string) => {
      const idx = tableSpec.findIndex((c) => c.type === type && c.spec.name === name);
      if (idx < 0) throw new Error(`${type} ${name} not in the table`);
      return idx;
    };
    const idx = [
      indexOf("axis", "pl7.app/sampleId"),
      indexOf("axis", "pl7.app/vdj/clonotypeKey"),
      indexOf("column", "pl7.app/vdj/uniqueCellCount"),
      indexOf("column", "pl7.app/vdj/sequence"),
      indexOf("column", "pl7.app/vdj/geneHit"),
    ];
    const [sample, key, cells, cdr3, vGene] = await driver.getData(tableHandle, idx);

    // Present values as `sample/key` or `key` → value, one entry per distinct pair.
    const present = (vec: typeof cdr3, withSample: boolean) => {
      const out: Record<string, string> = {};
      for (let row = 0; row < vec.data.length; row++) {
        if (isValueNA(vec, row)) continue;
        const k = withSample ? `${sample.data[row]}/${key.data[row]}` : String(key.data[row]);
        out[k] = String(vec.data[row]);
      }
      return out;
    };

    expect(present(cells, true)).toEqual({
      "S1/c01": "120",
      "S1/c02": "80",
      "S1/c03": "60",
      "S1/c05": "10",
      "S2/c01": "90",
      "S2/c02": "40",
      "S2/c04": "30",
    });
    // c02 keeps its valid CDR3 from S2: the NA row is filtered before one row per key is chosen.
    expect(present(cdr3, false)).toEqual({
      c01: "CARDYWGQGTLV",
      c02: "CARDYWGQGTLI",
      c03: "CASSLGTEAFF",
      c04: "CTRGGNWFDP",
    });
    // c05 keeps its V gene although its CDR3 is NA; c03 loses only its own NA V gene.
    expect(present(vGene, false)).toEqual({
      c01: "IGHV1-2",
      c02: "IGHV3-23",
      c04: "IGHV4-34",
      c05: "IGHV5-51",
    });
  },
);
