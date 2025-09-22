/**
 * @Description index.ts
 * @Author 侯文君
 * @Date 2025-09-23 9:46
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-23 17:31
 */

import { streamText } from 'ai';
import { initLocalTools } from '#server/core/tools/local-tools';
import { buildSystemPrompt } from '#server/core/agents/requirements-analysis/prompt';
import { llmProvider } from '#server/utils/model';
import type { ChatRequest } from '#shared/types/api/chat';

export const requirementsAnalysis = async ({
  messages,
  model,
  temperature,
}: ChatRequest) => {
  const localTools = initLocalTools();

  const result = streamText({
    model: llmProvider(model),
    temperature: temperature ?? 0.3,
    tools: { ...localTools },
    system: buildSystemPrompt(),
    providerOptions: {
      bailian: {
        enable_thinking: false,
      },
    },
    messages,
  });

  return result.toUIMessageStreamResponse();
};
