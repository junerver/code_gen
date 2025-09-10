/**
 * @Description model.ts
 * @Author 侯文君
 * @Date 2025-09-02 12:37
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-09 17:22
 */

/**
 * 硅基流动模型ID
 */
export type SiliconflowChatModelIds =
  | 'deepseek-ai/DeepSeek-R1'
  | 'deepseek-ai/DeepSeek-V3.1'
  | 'Qwen/Qwen2.5-72B-Instruct-128K'
  | 'Qwen/Qwen3-Coder-480B-A35B-Instruct'
  | 'Qwen/Qwen3-Coder-30B-A3B-Instruct'
  | 'moonshotai/Kimi-Dev-72B';

export type SiliconflowCompletionModelIds = string & {};

export type SiliconflowEmbeddingModelIds = string & {};

export type SiliconflowImageModelIds = string & {};

// 默认使用的模型
export const DEFAULT_MODEL = 'DeepSeek-Chat';

/**
 * 可用模型列表
 * id：模型ID
 * name：模型名称
 * description：模型描述
 * provider：模型提供方
 * middleware：模型中间件
 */
export const AvailableModels = [
  {
    id: 'deepseek-ai/DeepSeek-R1',
    name: 'DeepSeek-R1',
    description: '最新推理模型，擅长数学和编程',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.1',
    name: 'DeepSeek-V3.1',
    description: '通用对话模型，平衡性能优秀',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-128K',
    name: 'Qwen2.5-72B',
    description: '大参数模型，支持128K上下文',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    name: 'Qwen3-Coder-480B',
    description: '专业代码生成模型，超大参数',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
    name: 'Qwen3-Coder-30B',
    description: '轻量级代码生成模型',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'moonshotai/Kimi-Dev-72B',
    name: 'Kimi-Dev-72B',
    description: '新一代开源编程大模型，擅长数学和编程',
    provider: 'siliconflow',
    middleware: undefined,
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen2.5-7B',
    description: '千问2.5模型，支持32K上下文',
    provider: 'ollama',
    middleware: undefined,
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen2.5-Coder-7B',
    description: '千问2.5模型，支持32K上下文，轻量级代码生成模型',
    provider: 'ollama',
    middleware: undefined,
  },
  {
    id: 'qwen3:4b',
    name: 'Qwen3-4B',
    description: '千问3推理模型，支持256K上下文',
    provider: 'ollama',
    middleware: 'think',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-Chat',
    description: 'DeepSeekV3.1，官方chat模型',
    provider: 'deepseek',
    middleware: undefined,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-Reasoner',
    description: 'DeepSeek-R1，官方推理模型',
    provider: 'deepseek',
    middleware: undefined,
  },
] as const;

/**
 * 可用模型配置
 */
export type AvailableModelConfig = (typeof AvailableModels)[number];

/**
 * 全部可用的模型名称类型
 */
export type AvailableModelNames = AvailableModelConfig['name'];
