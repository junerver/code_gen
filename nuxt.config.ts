import { fileURLToPath } from 'node:url';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@unocss/nuxt',
  ],
  runtimeConfig: {
    siliconFlowApiUrl: '',
    siliconFlowApiKey: '',
    deepseekApiKey: '',
    bailianApiUrl: '',
    bailianApiKey: '',
    mcpServerDirectory: '',
  },
  alias: {
    '#server': fileURLToPath(new URL('./server', import.meta.url)),
  },
  unocss: {
    nuxtLayers: true,
  },
});
