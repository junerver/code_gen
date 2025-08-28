<script setup lang="ts">
import { Sandbox, useStore } from "@vue/repl";
import {
  buildBodyHtml,
  buildElementPlusSetup,
  buildHeadHtml,
  buildPlaygroundMain,
} from "#shared/utils/code";

const componentCode = ref("");
const dialogVisible = ref(false);

const elementPlusVersion = "2.10.7";
const elementIconVersion = "2.3.2";
const vueVersion = "3.5.19";

const store = useStore({
  vueVersion: ref(vueVersion),
  builtinImportMap: ref(
    generateImportMap(vueVersion, elementPlusVersion, elementIconVersion)
  ),
  sfcOptions: ref({
    script: {
      propsDestructure: true,
    },
  }),
});

// 预览选项配置
const previewOptions = ref({
  headHTML: buildHeadHtml(elementPlusVersion),
  bodyHTML: buildBodyHtml(),
  showRuntimeError: true,
  showRuntimeWarning: false,
});

watch(
  componentCode,
  () => {
    if (!componentCode.value) return;

    // 设置文件
    store.setFiles({
      "src/App.vue": componentCode.value,
      "src/element-plus.js": buildElementPlusSetup(elementPlusVersion),
      "src/PlaygroundMain.vue": buildPlaygroundMain(),
      "import-map.json": JSON.stringify(
        generateImportMap(vueVersion, elementPlusVersion, elementIconVersion),
        null,
        2
      ),
      "tsconfig.json": buildTsconfig(),
    });

    // 设置主文件
    store.mainFile = "src/PlaygroundMain.vue";
    store.activeFilename = "src/App.vue";
  },
  { immediate: true }
);

const openDialog = (code: string) => {
  const prCode = genPreviewCode(code);
  console.log("#", prCode);
  componentCode.value = prCode;
  dialogVisible.value = true;
};

defineExpose({ openDialog });
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="组件预览"
    width="90%"
    style="height: 80vh; overflow: hidden"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div style="height: 70vh; overflow: hidden">
      <Sandbox
        :store="store"
        :preview-options="previewOptions"
        :clear-console="false"
      />
    </div>
  </el-dialog>
</template>
