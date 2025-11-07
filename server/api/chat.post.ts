/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-11-07 15:32
 */

import type { H3Event } from 'h3';
import type { ChatRequest } from '#shared/types/api/chat';
import { genCodeBaseTemplate } from '#server/core/agents/base-template';
import { initTemplateTools } from '#server/core/tools/mcp-tools';
import { initLocalTools } from '#server/core/tools/local-tools';

export default defineLazyEventHandler(async () => {
  const mcpTools = await initTemplateTools();
  const localTools = initLocalTools();

  return defineEventHandler(async (event: H3Event) => {
    const request = await readBody<ChatRequest>(event);
    return genCodeBaseTemplate(request, { ...localTools, ...mcpTools });
  });
});
