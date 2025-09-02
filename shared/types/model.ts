export type SiliconflowChatModelIds =
  | 'deepseek-ai/DeepSeek-R1'
  | 'deepseek-ai/DeepSeek-V3.1'
  | 'Qwen/Qwen2.5-72B-Instruct-128K'
  | 'Qwen/Qwen3-Coder-480B-A35B-Instruct'
  | 'Qwen/Qwen3-Coder-30B-A3B-Instruct';

export type SiliconflowCompletionModelIds = string & {};

export type SiliconflowEmbeddingModelIds = string & {};

export type SiliconflowImageModelIds = string & {};

export const DefaultSelectModel = 'Qwen3-Coder-30B';

/**
 * 可用模型列表配置
 */
interface ModelOption {
  id: SiliconflowChatModelIds | string;
  name: string;
  description: string;
}

export const AvailableModels: ModelOption[] = [
  {
    id: 'deepseek-ai/DeepSeek-R1',
    name: 'DeepSeek-R1',
    description: '最新推理模型，擅长数学和编程',
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.1',
    name: 'DeepSeek-V3.1',
    description: '通用对话模型，平衡性能优秀',
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-128K',
    name: 'Qwen2.5-72B',
    description: '大参数模型，支持128K上下文',
  },
  {
    id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    name: 'Qwen3-Coder-480B',
    description: '专业代码生成模型，超大参数',
  },
  {
    id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
    name: 'Qwen3-Coder-30B',
    description: '轻量级代码生成模型',
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen2.5-7B',
    description: '本地ollama模型',
  },
];
