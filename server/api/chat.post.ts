/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-17 15:32
 */

import { stepCountIs, streamText } from 'ai';
import { llmProvider } from '#server/utils/model';
import { templateGenPrompt } from '#server/core/prompt/template-gen';
import { initMcpTools } from '#server/core/tools/mcp-tools';
import { templateContextStorage } from '#server/core/storage/template-context';
import type { H3Event } from 'h3';
import type { ChatRequest } from '#shared/types/api/chat';
import { initLocalTools } from '#server/core/tools/local-tools';

export default defineLazyEventHandler(async () => {
  // 初始化mcp工具
  const mcpTools = await initMcpTools();
  const localTools = initLocalTools();
  return defineEventHandler(async (event: H3Event) => {
    const {
      conversationId,
      messages,
      model,
      temperature = 0,
    } = await readBody<ChatRequest>(event);
    // 获取当前会话的模板上下文（如果存在）
    const templateContext = conversationId
      ? templateContextStorage.getContext(conversationId)
      : undefined;

    const result = streamText({
      model: llmProvider(model),
      temperature,
      tools: { ...mcpTools, ...localTools },
      stopWhen: stepCountIs(5),
      system: templateGenPrompt(true, templateContext),
      providerOptions: {
        bailian: {
          enable_thinking: false,
        },
      },
      messages,
      onStepFinish: ({ toolResults }) => {
        for (const toolResult of toolResults) {
          if (toolResult.dynamic) {
            // Dynamic tool: input is 'unknown'
            continue;
          }

          switch (toolResult.toolName) {
            case 'prepare_template_context':
              // 将模板上下文存储到映射中
              if (
                conversationId &&
                toolResult.input.table_name &&
                toolResult.output.structuredContent
              ) {
                templateContextStorage.setContext(
                  conversationId,
                  toolResult.input.table_name,
                  toolResult.output.structuredContent
                );
              }
              break;
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  });
});
