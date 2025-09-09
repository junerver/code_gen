<script setup lang="ts">
import { Repl } from '@vue/repl';
import Monaco from '@vue/repl/monaco-editor';
import {
  buildElementPlusSetup,
  buildHeadHtml,
  buildPlaygroundMain,
} from '#shared/utils/code';
import { genPreviewCode } from '#shared/utils/repair-vue';

const elementPlusVersion = '2.10.7';
const elementIconVersion = '2.3.2';
const vueVersion = '3.5.19';

const componentCode = ref('');
const dialogVisible = ref(false);
const loading = ref(true);

const store = useStore({
  serializedState: location.hash.slice(1),
  initialized: () => {
    loading.value = false;
  },
});

const previewOptions = {
  headHTML: buildHeadHtml(elementPlusVersion),
};

watch(
  componentCode,
  () => {
    if (!componentCode.value) return;

    // 设置文件
    store.setFiles({
      'src/App.vue': componentCode.value,
      'src/element-plus.js': buildElementPlusSetup(elementPlusVersion),
      'src/PlaygroundMain.vue': buildPlaygroundMain(),
      'import-map.json': JSON.stringify(
        generateImportMap(vueVersion, elementPlusVersion, elementIconVersion),
        null,
        2
      ),
      'tsconfig.json': buildTsconfig(),
    });

    // 设置主文件
    store.mainFile = 'src/PlaygroundMain.vue';
    store.activeFilename = 'src/App.vue';
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
      <Repl
        :preview-theme="true"
        :store="store"
        :editor="Monaco"
        :preview-options="previewOptions"
        :clear-console="false"
      />
    </div>
  </el-dialog>
</template>
