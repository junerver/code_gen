/**
 * @Description model.ts
 * @Author 侯文君
 * @Date 2025-08-25 15:37
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-25 17:20
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type SiliconflowChatModelIds =
  | "deepseek-ai/DeepSeek-R1"
  | "deepseek-ai/DeepSeek-V3.1"
  | "Qwen/Qwen2.5-72B-Instruct-128K"
  | "Qwen/Qwen3-Coder-480B-A35B-Instruct"
  | "Qwen/Qwen3-Coder-30B-A3B-Instruct";

type SiliconflowCompletionModelIds = string & {};

type SiliconflowEmbeddingModelIds = string & {};

type SiliconflowImageModelIds = string & {};

export const siliconflow = createOpenAICompatible<
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds
>({
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: "sk-mzasadcrsrmligxbhiylcaeechgkgebuoweuxdexpilvtsrs",
  name: "siliconflow",
});
