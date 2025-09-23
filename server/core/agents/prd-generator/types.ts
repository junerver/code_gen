import type { AvailableModelNames } from '#shared/types/model';
import type { SimplifiedPrdDocument } from './schema-simplified';

export interface GeneratePrdContext {
  knownConstraints?: string[]; // 已知的约束条件
  answeredQuestions?: Array<{
    // 已回答的问题
    question: string;
    answer: string;
  }>;
}

export interface GeneratePrdOptions {
  requirementText: string; // 需求描述
  model?: AvailableModelNames; // 模型名称，默认使用 DEFAULT_MODEL
  temperature?: number; // 温度
  context?: GeneratePrdContext; // 上下文，用于提供额外的信息
  includeGlossary?: boolean; // 是否包含 glossary 信息，默认包含
}

export interface GeneratePrdResult {
  prd: SimplifiedPrdDocument; // 生成的结构化 PRD 文档
  markdown: string; // 生成的 Markdown 文档
  promptTokens?: number; // 输入 tokens 数量
  completionTokens?: number; // 输出 tokens 数量
}
