<script setup lang="ts">
import { Sandbox, useStore } from "@vue/repl";

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
  headHTML: `
    <link rel="stylesheet" href="https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.css">
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
    </style>
  `,
  bodyHTML: '<div id="app"></div>',
});

// Element Plus 初始化代码
const elementPlusSetup = `import ElementPlus from 'element-plus'
import { getCurrentInstance } from 'vue'

let installed = false
await loadStyle()

export function setupElementPlus() {
  if (installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
  installed = true
}

export function loadStyle() {
  const styles = [
    'https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.css',
    'https://unpkg.com/element-plus@${elementPlusVersion}/theme-chalk/dark/css-vars.css'
  ].map((style) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = style
      link.addEventListener('load', resolve)
      link.addEventListener('error', reject)
      document.body.append(link)
    })
  })
  return Promise.allSettled(styles)
}`.replace(/\$\{elementPlusVersion\}/g, elementPlusVersion);

watch(
  componentCode,
  () => {
    if (!componentCode.value) return;

    // 设置文件
    store.setFiles({
      "App.vue": componentCode.value,
      "element-plus.js": elementPlusSetup,
      "import-map.json": JSON.stringify(generateImportMap(), null, 2),
    });

    // 设置主文件
    store.mainFile = "App.vue";
    store.activeFilename = "App.vue";
  },
  { immediate: true },
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
        :show-compile-output="false"
        :show-import-map="false"
        :clear-console="false"
      />
    </div>
  </el-dialog>
</template>
