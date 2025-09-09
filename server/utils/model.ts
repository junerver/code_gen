/**
 * @Description model.ts
 * @Author 侯文君
 * @Date 2025-08-25 15:37
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-09 17:04
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type {
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds,
  AvailableModelNames,
} from '#shared/types/model';
import { AvailableModels } from '#shared/types/model';
import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { createDeepSeek } from '@ai-sdk/deepseek';

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

const deepseek = createDeepSeek({
  apiKey: useRuntimeConfig().deepseekApiKey,
});

/**
 * 根据模型配置创建语言模型实例
 * @param modelConfig 模型配置对象
 * @returns 语言模型实例
 */
function createLanguageModel(
  modelConfig: (typeof AvailableModels)[number]
): LanguageModelV2 {
  const { id, provider, middleware } = modelConfig;

  let baseModel: LanguageModelV2;

  // 根据提供商创建基础模型
  switch (provider) {
    case 'siliconflow':
      baseModel = siliconflow(id as SiliconflowChatModelIds);
      break;
    case 'ollama':
      baseModel = ollama(id);
      break;
    case 'deepseek':
      baseModel = deepseek(id);
      break;
    default:
      throw new Error(`不支持的模型提供商: ${provider}`);
  }

  // 如果有中间件配置，则包装模型
  if (middleware === 'think') {
    return wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  return baseModel;
}

/**
 * 动态创建模型提供器
 * @returns 自定义模型提供器
 */
function createModelProvider() {
  const languageModels = {} as Record<AvailableModelNames, LanguageModelV2>;

  // 遍历可用模型列表，动态创建模型实例
  for (const modelConfig of AvailableModels) {
    languageModels[modelConfig.name] = createLanguageModel(modelConfig);
  }

  return customProvider({ languageModels });
}

/**
 * 自定义的模型提供器，所有可用模型通过模型提供器获取
 */
const modelProvider = createModelProvider();

/**
 * 对外暴露的类型安全的模型提供器
 * @param modelName
 */
export const llmProvider = (modelName: AvailableModelNames) =>
  modelProvider.languageModel(modelName);
