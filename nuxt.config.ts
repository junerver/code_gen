// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@element-plus/nuxt', '@pinia/nuxt'],
  runtimeConfig: {
    siliconFlowApiUrl: '',
    siliconFlowApiKey: '',
  },
});
