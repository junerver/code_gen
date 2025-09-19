/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-19 10:28
 */

import type { H3Event } from 'h3';
import type { ChatRequest } from '#shared/types/api/chat';
import { genCodeBaseTemplate } from '#server/core/agents/base-template';

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event: H3Event) => {
    const request = await readBody<ChatRequest>(event);
    return genCodeBaseTemplate(request);
  });
});
