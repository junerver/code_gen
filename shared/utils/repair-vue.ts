/**
 * @Description repair-vue.ts
 * @Author 侯文君
 * @Date 2025-09-09 10:24
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-09 10:29
 */

import { trimIndent } from '#shared/utils/string';

/**
 * 常用的Vue API列表
 */
const VUE_APIS = [
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'onMounted',
  'onUnmounted',
  'onUpdated',
  'onBeforeMount',
  'onBeforeUnmount',
  'nextTick',
  'defineProps',
  'defineEmits',
  'defineExpose',
  'shallowRef',
  'shallowReactive',
  'readonly',
  'shallowReadonly',
  'toRef',
  'toRefs',
  'unref',
  'isRef',
  'isReactive',
  'isReadonly',
  'isProxy',
  'provide',
  'inject',
  'getCurrentInstance',
  'useSlots',
  'useAttrs',
  'markRaw',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
  'customRef',
  'triggerRef',
  'toRaw',
];

/**
 * 检测代码中使用的Vue API
 * @param code 代码字符串
 * @returns 使用的Vue API数组
 */
const detectUsedVueApis = (code: string): string[] => {
  const usedApis: string[] = [];

  // 检查每个Vue API是否在代码中被使用
  VUE_APIS.forEach(api => {
    // 使用正则表达式检查API是否被使用（避免误匹配字符串中的内容）
    const regex = new RegExp(`\\b${api}\\b`, 'g');
    if (regex.test(code)) {
      usedApis.push(api);
    }
  });

  return usedApis;
};

/**
 * 从导入语句中提取已导入的API
 * @param script 脚本代码
 * @returns 已导入的Vue API数组
 */
const extractExistingVueImports = (script: string): string[] => {
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]vue['"]/g;
  const matches = script.match(importRegex);

  if (!matches) return [];

  const existingApis: string[] = [];
  matches.forEach(match => {
    const apiMatch = match.match(/import\s*{([^}]+)}/);
    if (apiMatch) {
      const apis =
        apiMatch?.[1]
          ?.split(',')
          ?.map(api => api.trim())
          ?.filter(api => api.length > 0) || [];
      existingApis.push(...apis);
    }
  });

  return [...new Set(existingApis)]; // 去重
};

/**
 * 生成Vue API导入语句
 * @param apis 需要导入的API数组
 * @returns 导入语句字符串
 */
const generateVueImport = (apis: string[]): string => {
  if (apis.length === 0) return '';

  return `import { ${apis.join(', ')} } from 'vue'`;
};

/**
 * 移除脚本中已存在的Vue导入语句
 * @param script 脚本代码
 * @returns 移除导入语句后的脚本代码
 */
const removeExistingVueImports = (script: string): string => {
  return script.replace(/import\s*{[^}]+}\s*from\s*['"]vue['"];?\s*\n?/g, '');
};

/**
 * 从代码中提取 Vue 相关的部分（template、script、style）
 * @param code 包含 Vue 组件代码的字符串
 * @returns 包含提取到的 template、script、style 代码的对象
 */
const extractVuePart = (code: string) => {
  // 使用更精确的匹配方式，确保匹配到最外层的标签
  // 通过查找标签的开始和结束位置来避免嵌套标签的干扰

  /**
   * 提取指定标签的内容
   * @param tagName 标签名称
   * @param attributes 标签属性（可选）
   * @returns 标签内容
   */
  const extractTagContent = (tagName: string, attributes: string = '') => {
    const openTag = attributes
      ? `<${tagName}${attributes.startsWith(' ') ? attributes : ' ' + attributes}>`
      : `<${tagName}>`;
    const closeTag = `</${tagName}>`;

    const startIndex = code.indexOf(openTag);
    if (startIndex === -1) return '';

    const contentStart = startIndex + openTag.length;
    let depth = 1;
    let currentIndex = contentStart;

    // 查找匹配的结束标签，处理嵌套情况
    while (currentIndex < code.length && depth > 0) {
      const nextOpen = code.indexOf(`<${tagName}`, currentIndex);
      const nextClose = code.indexOf(closeTag, currentIndex);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // 遇到嵌套的开始标签
        depth++;
        currentIndex = nextOpen + tagName.length + 1;
      } else {
        // 遇到结束标签
        depth--;
        if (depth === 0) {
          return code.substring(contentStart, nextClose).trim();
        }
        currentIndex = nextClose + closeTag.length;
      }
    }

    return '';
  };

  const template = extractTagContent('template');
  const script = extractTagContent('script', ' setup');
  const style = extractTagContent('style', ' scoped');

  return {
    template,
    script,
    style,
  };
};

/**
 * 创建可预览的代码
 * @param code 原始代码
 * @returns 可预览的代码字符串
 */
export const genPreviewCode = (code: string) => {
  // 提取Vue组件的模板、脚本和样式
  const { template, script, style } = extractVuePart(code);

  // 检测代码中使用的Vue API
  const usedVueApis = detectUsedVueApis(template + script);
  // 检查脚本中是否已经包含Vue的导入
  const hasVueImport =
    script.includes('from "vue"') || script.includes("from 'vue'");
  // 提取已存在的Vue导入API
  const existingVueImports = extractExistingVueImports(script);

  // 构建增强的脚本
  let enhancedScript = script;

  // 处理Vue API导入
  if (usedVueApis.length > 0) {
    if (hasVueImport) {
      // 如果已有导入，合并缺失的API
      const missingApis = usedVueApis.filter(
        api => !existingVueImports.includes(api)
      );
      if (missingApis.length > 0) {
        // 移除原有的导入语句
        enhancedScript = removeExistingVueImports(enhancedScript);
        // 生成新的完整导入语句
        const allApis = [...new Set([...existingVueImports, ...usedVueApis])];
        const vueImportStatement = generateVueImport(allApis);
        enhancedScript = `${vueImportStatement}\n${enhancedScript}`;
      }
    } else {
      // 如果没有导入，直接添加
      const vueImportStatement = generateVueImport(usedVueApis);
      enhancedScript = `${vueImportStatement}\n${enhancedScript}`;
    }
  }

  return trimIndent(`
    <template>
    ${template}
    </template>

    <script setup>
    ${enhancedScript}
    </script>

    <style scoped>
    ${style}
    </style>
  `);
};
