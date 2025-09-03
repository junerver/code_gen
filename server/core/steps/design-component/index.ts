/**
 * @Description index.ts
 * @Author 侯文君
 * @Date 2025-08-27 15:11
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-27 16:17
 */

import { generateObject } from 'ai';
import z from 'zod';

export async function generateComponentDesign(query: string) {
  const systemPrompt = `
    您是一名高级前端工程师，擅长开发UI组件。

    ## 目标
    从业务需求和设计稿中提取开发UI组件所需的“基本组件材料”、组件名称和描述信息。

    ## 约束
    1. 只能使用element-plus组件库存在的组件。
    2. 图标可以使用 @element-plus/icons-vue 组件库中的图标。
    3. 组件的样式必须符合element-plus的样式规范。

    ## 流程
    1. 分析业务需求和设计稿，提取组件的基本功能和样式需求。
    2. 从element-plus组件库中选择合适的组件作为基础组件。
    3. 生成结构化的组件设计文档。
  `;
  const { object } = await generateObject({
    model: modelProvider.languageModel('Qwen3-Coder-30B'),
    system: systemPrompt,
    prompt: query,
    schema: z.object({
      componentName: z.string(),
      componentDescription: z.string(),
      componentBasicFunction: z.string(),
      componentStyle: z.string(),
    }),
  });
  return object;
}
