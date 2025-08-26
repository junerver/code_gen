<script setup lang="ts">
import { Sandbox, useStore } from "@vue/repl";
import {
  buildBodyHtml,
  buildElementPlusSetup,
  buildHeadHtml,
} from "#shared/utils/code";

const componentCode = ref("");
const dialogVisible = ref(false);

const elementPlusVersion = "2.10.7";
const elementIconVersion = "2.3.2";
const vueVersion = "3.5.19";

// 生成导入映射
const generateImportMap = () => {
  return {
    imports: {
      vue: `https://unpkg.com/vue@${vueVersion}/dist/vue.esm-browser.js`,
      "@vue/shared": `https://unpkg.com/@vue/shared@${vueVersion}/dist/shared.esm-bundler.js`,
      "element-plus": `https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.full.min.mjs`,
      "element-plus/": `https://unpkg.com/element-plus@${elementPlusVersion}/`,
      "@element-plus/icons-vue": `https://unpkg.com/@element-plus/icons-vue@${elementIconVersion}/dist/index.min.js`,
    },
  };
};

const store = useStore({
  vueVersion: ref(vueVersion),
  builtinImportMap: ref(generateImportMap()),
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
      "App.vue": componentCode.value,
      "element-plus.js": buildElementPlusSetup(elementPlusVersion),
      "import-map.json": JSON.stringify(generateImportMap(), null, 2),
    });

    // 设置主文件
    store.mainFile = "App.vue";
    store.activeFilename = "App.vue";
  },
  { immediate: true }
);

const openDialog = (code: string) => {
  componentCode.value = genPreviewCode(code);
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
