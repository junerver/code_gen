/**
 * @Description 聊天消息与对话相关类型定义
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { z } from 'zod';

// 消息角色定义
export const MessageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
  'tool',
]);

// 聊天消息定义
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.date().optional(),
  metadata: z
    .object({
      tokens: z.number().optional(),
      model: z.string().optional(),
      processingTime: z.number().optional(),
      toolCalls: z
        .array(
          z.object({
            id: z.string(),
            type: z.string(),
            function: z.object({
              name: z.string(),
              arguments: z.string(),
            }),
          })
        )
        .optional(),
    })
    .optional(),
});

// 工具调用定义
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()),
  }),
});

// 工具调用结果定义
export const ToolCallResultSchema = z.object({
  toolCallId: z.string(),
  result: z.any(),
  error: z.string().optional(),
});

// 流式响应数据定义
export const StreamResponseSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'tool_call', 'tool_result', 'finish', 'error']),
  content: z.string().optional(),
  toolCall: ToolCallSchema.optional(),
  toolResult: ToolCallResultSchema.optional(),
  finishReason: z
    .enum(['stop', 'length', 'tool_calls', 'content_filter'])
    .optional(),
  error: z.string().optional(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

// 会话状态定义
export const ConversationStateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  messages: z.array(ChatMessageSchema),
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    messageCount: z.number(),
    totalTokens: z.number().optional(),
    model: z.string().optional(),
    context: z.record(z.string(), z.any()).optional(),
  }),
  status: z
    .enum(['active', 'completed', 'error', 'cancelled'])
    .default('active'),
});

// 会话摘要定义
export const ConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  entities: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messageCount: z.number(),
});

// 导出类型定义
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;
export type StreamResponse = z.infer<typeof StreamResponseSchema>;
export type ConversationState = z.infer<typeof ConversationStateSchema>;
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
