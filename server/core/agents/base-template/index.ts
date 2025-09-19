/**
 * @Description index.ts
 * @Author 侯文君
 * @Date 2025-09-19 10:19
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-19 10:25
 */
import { stepCountIs, streamText } from 'ai';
import { initTemplateTools } from '#server/core/tools/mcp-tools';
import { initLocalTools } from '#server/core/tools/local-tools';
import { templateGenPrompt } from '#server/core/prompt/template-gen';
import { llmProvider } from '#server/utils/model';
import { templateContextStorage } from '#server/core/storage/template-context';
import type { ChatRequest } from '#shared/types/api/chat';

/**
 * 基于模板的代码生成
 * @param messages
 * @param model
 * @param temperature
 * @param conversationId
 */
export const genCodeBaseTemplate = async ({
  messages,
  model,
  temperature,
  conversationId,
}: ChatRequest) => {
  // 初始化mcp工具
  const mcpTools = await initTemplateTools();
  const localTools = initLocalTools();
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
};
