/**
 * @Description Requirements Conversation Agent Types
 * @Author Claude Code
 * @Date 2025-01-19
 */

import { z } from 'zod';

// 对话状态枚举
export enum ConversationState {
  INITIAL = 'initial', // 初始状态，等待用户输入
  CLARIFYING = 'clarifying', // 澄清阶段，询问问题
  COLLECTING = 'collecting', // 收集阶段，收集用户回答
  DOCUMENTING = 'documenting', // 文档生成阶段
  COMPLETED = 'completed', // 完成状态
  ERROR = 'error', // 错误状态
}

// 消息类型枚举
export enum MessageType {
  USER_INPUT = 'user_input', // 用户输入
  CLARIFICATION_QUESTION = 'clarification_question', // 澄清问题
  USER_ANSWER = 'user_answer', // 用户回答
  SYSTEM_MESSAGE = 'system_message', // 系统消息
  REQUIREMENT_DOCUMENT = 'requirement_document', // 需求文档
}

// 消息优先级
export enum MessagePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// 澄清问题分类
export enum QuestionCategory {
  FUNCTIONAL = 'functional', // 功能性问题
  TECHNICAL = 'technical', // 技术性问题
  BUSINESS = 'business', // 业务性问题
  PERFORMANCE = 'performance', // 性能问题
  SECURITY = 'security', // 安全问题
  UI_UX = 'ui_ux', // 用户界面/体验问题
}

// 对话消息Schema
export const ConversationMessageSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(MessageType),
  content: z.string().min(1, '消息内容不能为空'),
  timestamp: z.date(),
  priority: z.nativeEnum(MessagePriority).optional(),
  category: z.nativeEnum(QuestionCategory).optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});

// 澄清问题Schema
export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(10, '问题描述至少10个字符'),
  context: z.string().min(20, '问题上下文至少20个字符'),
  priority: z.nativeEnum(MessagePriority),
  category: z.nativeEnum(QuestionCategory),
  suggestedAnswers: z.array(z.string()).optional(),
  whyImportant: z.string().optional(),
  impact: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  answered: z.boolean().default(false),
  answer: z.string().optional(),
});

// 需求文档Schema
export const RequirementDocumentSchema = z.object({
  id: z.string(),
  title: z.string().min(5, '标题至少5个字符'),
  description: z.string().min(50, '描述至少50个字符'),
  functionalRequirements: z.array(z.string()).min(1, '至少需要一个功能需求'),
  nonFunctionalRequirements: z.array(z.string()).optional(),
  businessRules: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  domain: z.string().optional(),
  priority: z.nativeEnum(MessagePriority).default(MessagePriority.MEDIUM),
  estimatedComplexity: z
    .enum(['simple', 'medium', 'complex', 'highly_complex'])
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.string().default('1.0'),
  metadata: z.record(z.any(), z.any()).optional(),
});

// 对话会话Schema
export const ConversationSessionSchema = z.object({
  id: z.string(),
  state: z.nativeEnum(ConversationState),
  messages: z.array(ConversationMessageSchema),
  clarificationQuestions: z.array(ClarificationQuestionSchema),
  requirementDocument: RequirementDocumentSchema.optional(),
  originalUserInput: z.string(),
  currentQuestionIndex: z.number().default(0),
  maxQuestions: z.number().default(10),
  confidenceScore: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any(), z.any()).optional(),
});

// 对话Agent配置Schema
export const ConversationAgentOptionsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxQuestions: z.number().min(1).max(20).default(10),
  minConfidenceScore: z.number().min(0).max(1).default(0.8),
  enableDomainDetection: z.boolean().default(true),
  questionGenerationStrategy: z
    .enum(['comprehensive', 'focused', 'minimal'])
    .default('focused'),
  autoCompleteThreshold: z.number().min(0).max(1).default(0.9),
});

// 对话响应Schema
export const ConversationResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string(),
  state: z.nativeEnum(ConversationState),
  message: z.string().optional(),
  clarificationQuestion: ClarificationQuestionSchema.optional(),
  requirementDocument: RequirementDocumentSchema.optional(),
  progress: z
    .object({
      currentStep: z.number(),
      totalSteps: z.number(),
      completionPercentage: z.number().min(0).max(100),
    })
    .optional(),
  error: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

// TypeScript类型导出
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type RequirementDocument = z.infer<typeof RequirementDocumentSchema>;
export type ConversationSession = z.infer<typeof ConversationSessionSchema>;
export type ConversationAgentOptions = z.infer<
  typeof ConversationAgentOptionsSchema
>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

// 工具函数类型
export interface ConversationAnalytics {
  totalSessions: number;
  averageQuestionsPerSession: number;
  averageCompletionTime: number;
  commonQuestionCategories: QuestionCategory[];
  successRate: number;
}

export interface QuestionGenerationContext {
  userInput: string;
  domain?: string;
  previousQuestions: ClarificationQuestion[];
  userAnswers: Record<string, string>;
  confidenceScore: number;
}
