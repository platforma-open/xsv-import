import type { BlockData, SpecUI } from "@platforma-open/milaboratories.xsv-import.model";
import { createPlDataTableStateV2 } from "@platforma-sdk/model";
import { blockTest } from "@platforma-sdk/test";
import type { ML } from "@platforma-sdk/test";
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

blockTest(
  "imports a TSV and publishes its columns",
  { timeout: 120000 },
  async ({ rawPrj, helpers, expect }) => {
    const blockId = await rawPrj.addBlock("CSV/TSV Import", XsvImportBlockPointer);
    const fileHandle = await helpers.getLocalFileHandle(path.join(assets, "clonotypes.tsv"));

    const data: BlockData = {
      fileHandle,
      spec: clonotypesSpec(),
      tableState: createPlDataTableStateV2(),
    };
    await rawPrj.mutateBlockStorage(blockId, { operation: "update-block-data", value: data });
    await rawPrj.runBlock(blockId);
    await awaitBlockDoneObserved(rawPrj, blockId, 90000);

    const state = await helpers.awaitBlockDoneAndGetStableBlockState(blockId, 30000);
    const table = state.outputs.filePFrame as { ok: boolean; value?: { fullTableHandle?: string } };
    expect(table.ok).toBe(true);
    expect(table.value?.fullTableHandle).toBeDefined();
  },
);
