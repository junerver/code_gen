/**
 * @Description model.ts
 * @Author 侯文君
 * @Date 2025-08-25 15:37
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-03 15:19
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type {
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds,
} from '#shared/types/model';
import { customProvider } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import type { LanguageModelV2 } from '@ai-sdk/provider';

/**
 * 硅基流动模型封装
 */
const siliconflow = createOpenAICompatible<
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds
>({
  baseURL: useRuntimeConfig().siliconFlowApiUrl,
  apiKey: useRuntimeConfig().siliconFlowApiKey,
  name: 'siliconflow',
});

/**
 * 自定义的模型提供器，所有可用模型通过模型提供器获取
 */
const modelProvider = customProvider({
  languageModels: {
    'Qwen3-Coder-30B': siliconflow('Qwen/Qwen3-Coder-30B-A3B-Instruct'),
    'Qwen3-Coder-480B': siliconflow('Qwen/Qwen3-Coder-480B-A35B-Instruct'),
    'Qwen2.5-72B': siliconflow('Qwen/Qwen2.5-72B-Instruct-128K'),
    'DeepSeek-R1': siliconflow('deepseek-ai/DeepSeek-R1'),
    'DeepSeek-V3.1': siliconflow('deepseek-ai/DeepSeek-V3.1'),
    'Qwen2.5-7B': ollama('qwen2.5:7b'),
    'Qwen3-4B': ollama('qwen3:4b'),
  } satisfies Record<AvailableModelNames, LanguageModelV2>,
});

/**
 * 对外暴露的类型安全的模型提供器
 * @param modelName
 */
export const llmProvider = (modelName: AvailableModelNames) =>
  modelProvider.languageModel(modelName);
