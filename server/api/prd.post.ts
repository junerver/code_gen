/**
 * @Description prd.post.ts
 * @Author 侯文君
 * @Date 2025-09-24 11:23
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-24 11:24
 */
import type { H3Event } from 'h3';
import { generatePrdDocument } from '#server/core/agents/prd-generator';
import type { GeneratePrdOptions } from '#server/core/agents/prd-generator/types';

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event: H3Event) => {
    const request = await readBody<GeneratePrdOptions>(event);
    return generatePrdDocument(request);
  });
});
