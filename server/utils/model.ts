/**
 * @Description model.ts
 * @Author 侯文君
 * @Date 2025-08-25 15:37
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-02 13:25
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type {
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds,
} from '#shared/types/model';

export const siliconflow = createOpenAICompatible<
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds
>({
  baseURL: useRuntimeConfig().siliconFlowApiUrl,
  apiKey: useRuntimeConfig().siliconFlowApiKey,
  name: 'siliconflow',
});
