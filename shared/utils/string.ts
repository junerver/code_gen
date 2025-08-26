/**
 * @Description 用于提取代码的工具函数
 * @Author 侯文君
 * @Date 2025-08-22 09:09
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-22 09:13
 */

/**
 * 移除字符串的缩进
 * @param str 包含缩进的字符串
 * @returns 移除缩进后的字符串
 */
export function trimIndent(str: string) {
  if (!str) return str;
  const lines = str.split('\n');

  // 移除第一行如果为空
  if (lines[0]?.trim() === '') lines.shift();
  if (lines[lines.length - 1]?.trim() === '') lines.pop();

  const indent = Math.min(
    ...lines.filter(line => line.trim()).map(line => line.search(/\S/)), // 第一个非空白字符的位置
  );

  return lines.map(line => line.slice(indent)).join('\n');
}
