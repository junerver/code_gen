import { tool } from 'ai';
import z from 'zod';
/**
 * 本地工具
 * @returns 本地工具
 */
export const initLocalTools = () => {
  // 示例：构建一个本地工具
  return {
    dateTime: tool({
      description: 'Get the current date and time',
      inputSchema: z.object(),
      execute: () => {
        const date = new Date();
        return date.toISOString().split('T')[0];
      },
    }),
  };
};
