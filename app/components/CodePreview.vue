<script setup lang="ts">
import { Sandbox, useStore } from "@vue/repl";

const componentCode = ref("");
const dialogVisible = ref(false);

const elementPlusVersion = "2.10.7";
const elementIconVersion = "2.3.2";
const vueVersion = "3.5.19";

const store = useStore({
  // 这里必须是 ref
  vueVersion: ref("3.5.19"),

  builtinImportMap: ref({
    imports: {
      vue: `https://unpkg.com/vue@${vueVersion}/dist/vue.esm-browser.js`,
      "@vue/shared": `https://unpkg.com/@vue/shared@${vueVersion}/dist/shared.esm-bundler.js`,
      "element-plus": `https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.full.mjs`,
      "element-plus/dist/index.css": `https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.css`,
      "@element-plus/icons-vue": `https://unpkg.com/@element-plus/icons-vue@${elementIconVersion}/dist/index.min.js`,
      "normalize.css": "https://unpkg.com/normalize.css/normalize.css",
    },
  }),

  sfcOptions: ref({
    script: {
      propsDestructure: true,
    },
  }),
});

watch(
  componentCode,
  () => {
    // 设置文件（必须至少有 App.vue）
    store.setFiles({
      "App.vue": componentCode.value,
      "index.html": `<div id="app"></div>`,
      "main.js": `
        import ElementPlus from 'element-plus'
        import { ElIcon } from 'element-plus'
        import * as ElementPlusIconsVue from '@element-plus/icons-vue'
        import 'element-plus/dist/index.css'
        import 'normalize.css'
        import { createApp } from 'vue'
        import App from './App.vue'

        const app = createApp(App)
        app.use(ElementPlus)
        app.component('ElIcon', ElIcon)

        for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
          app.component(key, component)
        }

        app.mount('#app')
    `,
    });
  },
  { immediate: true }
);

const openDialog = (code: string) => {
  const previewCode = genPreviewCode(code, elementPlusVersion);
  console.log("预览代码1:", previewCode);
  componentCode.value = previewCode;
  dialogVisible.value = true;
};

defineExpose({ openDialog });
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="组件预览"
    width="80%"
    style="height: 600px; overflow: auto"
  >
    <Sandbox :store="store" />
  </el-dialog>
</template>
