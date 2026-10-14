import { platforma } from "@platforma-open/milaboratories.xsv-import.model";
import { defineAppV3 } from "@platforma-sdk/ui-vue";
import DataPage from "./DataPage.vue";
import MainPage from "./MainPage.vue";

export const sdkPlugin = defineAppV3(platforma, () => {
  return {
    routes: {
      "/": () => MainPage,
      "/data": () => DataPage,
    },
  };
});

export const useApp = sdkPlugin.useApp;
