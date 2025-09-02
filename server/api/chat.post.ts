/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-02 17:47
 */

import { stepCountIs, streamText } from 'ai';
import { modelProvider } from '#server/utils/model';
import { templateGenPrompt } from '#server/core/prompt/template-gen';
import { initMcpTools } from '#server/core/tools/mcp-tools';

export default defineLazyEventHandler(async () => {
  // 初始化mcp工具
  const tools = await initMcpTools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return defineEventHandler(async (event: any) => {
    const { messages, model } = await readBody(event);
    const result = streamText({
      model: modelProvider.languageModel(model), // ollama("qwen2.5:7b")
      tools,
      stopWhen: stepCountIs(10),
      system: templateGenPrompt(),
      messages,
    });

    return result.toUIMessageStreamResponse();
  });
});
