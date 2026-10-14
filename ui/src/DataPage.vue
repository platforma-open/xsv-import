<script setup lang="ts">
import { PlAgDataTableV2, PlBlockPage, usePlDataTableSettingsV2 } from "@platforma-sdk/ui-vue";
import { useApp } from "./app";

const app = useApp();

const tableSettings = usePlDataTableSettingsV2({
  model: () => app.model.outputs.filePFrame,
});
</script>

<template>
  <PlBlockPage>
    <template #title> Imported Data </template>

    <PlAgDataTableV2 v-model="app.model.data.tableState" :settings="tableSettings" />
  </PlBlockPage>
</template>
