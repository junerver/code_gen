/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-08 11:02
 */

import { stepCountIs, streamText } from 'ai';
import { llmProvider } from '#server/utils/model';
import { templateGenPrompt } from '#server/core/prompt/template-gen';
import { initMcpTools } from '#server/core/tools/mcp-tools';
import type { H3Event } from 'h3';
import type { ChatRequest } from '#shared/types/api/chat';
import { initLocalTools } from '#server/core/tools/local-tools';

export default defineLazyEventHandler(async () => {
  // 初始化mcp工具
  const mcpTools = await initMcpTools();
  const localTools = initLocalTools();
  return defineEventHandler(async (event: H3Event) => {
    const {
      messages,
      model,
      temperature = 0,
    } = await readBody<ChatRequest>(event);
    const result = streamText({
      model: llmProvider(model),
      temperature,
      tools: { ...mcpTools, ...localTools },
      stopWhen: stepCountIs(10),
      system: templateGenPrompt(),
      messages,
    });

    return result.toUIMessageStreamResponse();
  });
});
