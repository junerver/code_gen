/**
 * @Description format.ts
 * @Author 侯文君
 * @Date 2025-08-29 15:47
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-11 13:46
 */
import * as prettier from 'prettier';

/**
 * Prettier支持的语言列表
 */
const PRETTIER_SUPPORT_LANGUAGES = [
  'vue',
  'html',
  'css',
  'scss',
  'less',
  'javascript',
  'typescript',
  'json',
  'markdown',
  'yaml',
];

/**
 * 格式化代码
 * @param code 待格式化的代码字符串
 * @param language 代码语言
 * @param fileName 文件名
 * @returns 格式化后的代码字符串
 */
export const formatCode = (
  code: string,
  language: string,
  fileName: string
) => {
  if (!PRETTIER_SUPPORT_LANGUAGES.includes(language)) {
    return code;
  }
  return prettier.format(code, {
    filepath: fileName,
  });
};
