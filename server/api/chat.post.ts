/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-08-18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-15 15:29
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
      stopWhen: stepCountIs(5),
      system: templateGenPrompt(),
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
            console.log('Dynamic:', toolResult.toolName, toolResult.input);
            continue;
          }

          switch (toolResult.toolName) {
            case 'prepare_template_context':
              console.log(
                'prepare_template_context：',
                toolResult.input.table_name,
                toolResult.output.structuredContent
              ); // typed as string
              break;
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  });
});
