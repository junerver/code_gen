/**
 * @Description 用于提取代码的工具函数
 * @Author 侯文君
 * @Date 2025-08-20 16:45
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-11 09:42
 */

export type ExtractCodeResult = {
  /** 源代码 */
  sourceCode: string;
  /** 源代码的行数 */
  lineCount?: number;
  /** 源代码的列数 */
  columnCount?: number;
  /** 源代码语言 */
  language?: string;
};

/**
 * 从文本内容中提取指定语言的代码块
 * @param content 包含代码块的文本内容
 * @param language 可选的语言标识，如果指定则只匹配该语言的代码块
 * @param index 可选的索引，指定提取第几个代码块（从0开始），默认为0
 * @returns 提取到的代码内容及相关信息
 */
export const extractCode = (
  content: string,
  language?: string,
  index: number = 0
): ExtractCodeResult => {
  // 正则表达式匹配代码块，支持可选的语言标识
  const codeRegex = language
    ? new RegExp(`\`\`\`${language}[\\s\\S]*?\`\`\``, 'g')
    : /```[\s\S]*?```/g;

  const matches = content.match(codeRegex);
  if (!matches || matches.length <= index) {
    return {
      sourceCode: '',
      lineCount: 0,
      columnCount: 0,
      language: language || undefined,
    };
  }

  // 提取指定索引的代码块中的实际代码内容
  const codeBlock = matches[index];

  // 提取语言标识
  const languageMatch = codeBlock?.match(/^```(\w+)/);
  const detectedLanguage = languageMatch ? languageMatch[1] : language;

  // 移除开头的 ```language 或 ``` 和结尾的 ```
  const code = (codeBlock || '')
    .replace(/^```(?:\w+)?\s*/, '') // 移除开头的```和可选的语言标识
    .replace(/\s*```$/, ''); // 移除结尾的```

  const trimmedCode = code.trim();

  // 计算行数和最大列数
  const lines = trimmedCode.split('\n');
  const lineCount = lines.length;
  const columnCount = Math.max(...lines.map(line => line.length), 0);

  return {
    sourceCode: trimmedCode,
    lineCount,
    columnCount,
    language: detectedLanguage,
  };
};

/**
 * Element Plus 初始化代码
 * @param elementPlusVersion
 */
export const buildElementPlusSetup = (elementPlusVersion: string) => {
  return `import ElementPlus from 'element-plus'
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
};

/**
 * 构建可预览的代码的主函数
 * @returns 可预览的代码字符串
 */
export const buildPlaygroundMain = () => {
  return `
<script setup>
import App from './App.vue'
import { setupElementPlus } from './element-plus.js'
setupElementPlus()
</script>

<template>
  <App />
</template>
`;
};

export const buildHeadHtml = (elementPlusVersion: string) => {
  return `
<link rel="stylesheet" href="https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.css">
<style>
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>
<script>
  window.__unocss = {
    rules: [],
    presets: [],
  }
</script>`;
};

export const buildBodyHtml = () => {
  return `<div id="app"></div>`;
};

/**
 * 生成导入映射
 * @param vueVersion Vue 版本号
 * @param elementPlusVersion Element Plus 版本号
 * @param elementIconVersion Element Icon 版本号
 * @returns 导入映射对象
 */
export const generateImportMap = (
  vueVersion: string,
  elementPlusVersion: string,
  elementIconVersion: string
) => {
  return {
    imports: {
      vue: `https://unpkg.com/vue@${vueVersion}/dist/vue.esm-browser.js`,
      '@vue/shared': `https://unpkg.com/@vue/shared@${vueVersion}/dist/shared.esm-bundler.js`,
      'element-plus': `https://unpkg.com/element-plus@${elementPlusVersion}/dist/index.full.min.mjs`,
      'element-plus/': `https://unpkg.com/element-plus@${elementPlusVersion}/`,
      '@element-plus/icons-vue': `https://unpkg.com/@element-plus/icons-vue@${elementIconVersion}/dist/index.min.js`,
    },
  };
};

/**
 * 构建 tsconfig.json 文件
 * @returns tsconfig.json 字符串
 */
export const buildTsconfig = () => {
  return `{
  "compilerOptions": {
    "target": "ESNext",
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["element-plus/global.d.ts"],
    "allowImportingTsExtensions": true,
    "allowJs": true,
    "checkJs": true
  },
  "vueCompilerOptions": {
    "target": 3.3
  }
}`;
};

/**
 * 语言标签与文件扩展名映射表
 */
const LanguageMap: { [key: string]: string } = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  php: 'php',
  go: 'go',
  ruby: 'rb',
  perl: 'pl',
  sql: 'sql',
  html: 'html',
  css: 'css',
  xml: 'xml',
  json: 'json',
  markdown: 'md',
  vue: 'vue',
};

/**
 * 获取文件扩展名
 * @param language 语言标签
 * @returns 文件扩展名
 */
export const getFileExtension = (language?: string) => {
  return language ? LanguageMap[language.toLowerCase()] || 'txt' : 'txt';
};
