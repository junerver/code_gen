/**
 * @Description Requirements Clarification API Endpoint
 * @Author Claude Code
 * @Date 2025-09-22
 *
 * 提供一个统一的接口，通过多轮对话帮助用户澄清和细化需求
 * 直到需求足够清晰后生成结构化需求文档
 */

import type { H3Event } from 'h3';
import { RequirementsClarificationAgent } from '#server/core/agents/requirements-clarification';

// API Request/Response types
export interface ConversationRequest {
  message: string;
  conversationId?: string;
  context?: {
    domain?: string;
    previousMessages?: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp?: number;
    }>;
  };
  model?: string;
}

export interface ConversationResponse {
  success: boolean;
  conversationId: string;
  response: string;
  status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
  clarificationQuestions?: string[];
  requirementDocument?: any;
  confidence?: number;
  error?: string;
  suggestion?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ConversationResponse> => {
    try {
      const body = await readBody<ConversationRequest>(event);

      if (!body.message?.trim()) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Message is required',
        });
      }

      const agent = new RequirementsClarificationAgent({
        model: body.model as any,
        conversationId: body.conversationId,
      });

      const result = await agent.processMessage(body.message, body.context);

      console.log(`Requirements conversation processed`, {
        conversationId: result.conversationId,
        status: result.status,
        hasClarificationQuestions: !!result.clarificationQuestions?.length,
        hasRequirementDocument: !!result.requirementDocument,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      console.error('API Error in requirements conversation:', error);

      throw createError({
        statusCode:
          error instanceof Error && 'statusCode' in error
            ? (error as any).statusCode
            : 500,
        statusMessage:
          error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);
