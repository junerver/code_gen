/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-01 13:49
 */

import { streamText } from 'ai';
import { siliconflow } from '../utils/model';
import { templateGenPrompt } from '#shared/prompt/template-gen';

export default defineLazyEventHandler(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return defineEventHandler(async (event: any) => {
    const { messages } = await readBody(event);
    const result = streamText({
      model: siliconflow('Qwen/Qwen3-Coder-30B-A3B-Instruct'), // ollama("qwen2.5:7b")
      system: templateGenPrompt(),
      messages,
    });

    return result.toUIMessageStreamResponse();
  });
});
