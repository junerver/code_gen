/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @Description Requirements Conversation API Endpoint
 * @Author Claude Code
 * @Date 2025-01-19
 */

import type { H3Event } from 'h3';
import { RequirementsConversationAgent } from '#server/core/agents/requirements-conversation';
import { parseRequirementsFromDocument } from '#server/core/agents/requirements-parser';
import type { ConversationAgentOptions } from '#server/core/agents/requirements-conversation/types';

// 全局Agent实例管理
const conversationAgents = new Map<string, RequirementsConversationAgent>();

// 清理过期Agent实例
setInterval(
  () => {
    for (const [key, agent] of conversationAgents.entries()) {
      const cleanedCount = agent.cleanupExpiredSessions(24); // 24小时过期
      if (cleanedCount > 0) {
        console.log(`清理了 ${cleanedCount} 个过期会话`);
      }

      // 如果Agent没有活跃会话，移除Agent实例
      if (agent.getActiveSessions().length === 0) {
        conversationAgents.delete(key);
      }
    }
  },
  60 * 60 * 1000
); // 每小时清理一次

export interface StartConversationRequest {
  userInput: string;
  options?: ConversationAgentOptions;
}

export interface ContinueConversationRequest {
  sessionId: string;
  userAnswer: string;
  agentId?: string;
}

export interface GenerateBusinessModelRequest {
  requirementDocument: string;
  options?: {
    model?: string;
    temperature?: number;
    includeConfidenceAnalysis?: boolean;
  };
}

export interface ConversationApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  sessionId?: string;
  state?: string;
  message?: string;
  clarificationQuestion?: any;
  requirementDocument?: any;
  businessModel?: any;
  progress?: {
    currentStep: number;
    totalSteps: number;
    completionPercentage: number;
  };
}

export default defineEventHandler(
  async (event: H3Event): Promise<ConversationApiResponse> => {
    try {
      const method = getMethod(event);
      const body = await readBody(event);

      // 根据请求类型处理不同的操作
      const action = body.action || 'start'; // start, continue, generate_model

      switch (action) {
        case 'start':
          return await handleStartConversation(
            body as StartConversationRequest
          );

        case 'continue':
          return await handleContinueConversation(
            body as ContinueConversationRequest
          );

        case 'generate_model':
          return await handleGenerateBusinessModel(
            body as GenerateBusinessModelRequest
          );

        default:
          throw createError({
            statusCode: 400,
            statusMessage: `不支持的操作: ${action}`,
          });
      }
    } catch (error) {
      console.error('需求对话API错误:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
);

/**
 * 处理开始对话请求
 */
async function handleStartConversation(
  request: StartConversationRequest
): Promise<ConversationApiResponse> {
  if (!request.userInput?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户输入不能为空',
    });
  }

  console.log('开始新的需求对话', {
    inputLength: request.userInput.length,
    hasOptions: !!request.options,
  });

  // 创建新的对话Agent实例
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const agent = new RequirementsConversationAgent(request.options);
  conversationAgents.set(agentId, agent);

  try {
    const result = await agent.startConversation(request.userInput);

    console.log('对话启动结果', {
      success: result.success,
      state: result.state,
      hasQuestion: !!result.clarificationQuestion,
      sessionId: result.sessionId,
    });

    return {
      success: result.success,
      sessionId: result.sessionId,
      state: result.state,
      message: result.message,
      clarificationQuestion: result.clarificationQuestion,
      requirementDocument: result.requirementDocument,
      progress: result.progress,
      error: result.error,
      data: {
        agentId, // 返回Agent ID供后续请求使用
        ...result,
      },
    };
  } catch (error) {
    // 清理失败的Agent实例
    conversationAgents.delete(agentId);
    throw error;
  }
}

/**
 * 处理继续对话请求
 */
async function handleContinueConversation(
  request: ContinueConversationRequest
): Promise<ConversationApiResponse> {
  if (!request.sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: '会话ID不能为空',
    });
  }

  if (!request.userAnswer?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户回答不能为空',
    });
  }

  // 查找对应的Agent实例
  let agent: RequirementsConversationAgent | undefined;

  if (request.agentId) {
    agent = conversationAgents.get(request.agentId);
  } else {
    // 如果没有提供agentId，尝试从所有Agent中查找会话
    for (const [id, agentInstance] of conversationAgents.entries()) {
      if (agentInstance.getSession(request.sessionId)) {
        agent = agentInstance;
        break;
      }
    }
  }

  if (!agent) {
    throw createError({
      statusCode: 404,
      statusMessage: '找不到对应的对话会话',
    });
  }

  console.log('继续对话', {
    sessionId: request.sessionId,
    answerLength: request.userAnswer.length,
  });

  const result = await agent.continueConversation(
    request.sessionId,
    request.userAnswer
  );

  console.log('对话继续结果', {
    success: result.success,
    state: result.state,
    hasQuestion: !!result.clarificationQuestion,
    hasDocument: !!result.requirementDocument,
  });

  return {
    success: result.success,
    sessionId: result.sessionId,
    state: result.state,
    message: result.message,
    clarificationQuestion: result.clarificationQuestion,
    requirementDocument: result.requirementDocument,
    progress: result.progress,
    error: result.error,
    data: result,
  };
}

/**
 * 处理生成业务模型请求
 */
async function handleGenerateBusinessModel(
  request: GenerateBusinessModelRequest
): Promise<ConversationApiResponse> {
  if (!request.requirementDocument?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '需求文档不能为空',
    });
  }

  console.log('开始生成业务模型', {
    documentLength: request.requirementDocument.length,
    hasOptions: !!request.options,
  });

  try {
    const result = await parseRequirementsFromDocument(
      request.requirementDocument,
      request.options
    );

    console.log('业务模型生成结果', {
      success: result.success,
      entityCount: result.data?.entities?.length || 0,
      relationshipCount: result.data?.relationships?.length || 0,
      businessRuleCount: result.data?.businessRules?.length || 0,
    });

    return {
      success: result.success,
      businessModel: result.data,
      error: result.error,
      data: {
        businessModel: result.data,
        validationErrors: result.validationErrors,
        suggestion: result.suggestion,
      },
    };
  } catch (error) {
    console.error('生成业务模型时出错:', error);
    throw error;
  }
}

/**
 * 获取会话状态的辅助端点
 */
export async function getSessionStatus(sessionId: string): Promise<any> {
  for (const agent of conversationAgents.values()) {
    const session = agent.getSession(sessionId);
    if (session) {
      return {
        success: true,
        session: {
          id: session.id,
          state: session.state,
          messageCount: session.messages.length,
          questionCount: session.clarificationQuestions.length,
          currentQuestionIndex: session.currentQuestionIndex,
          hasDocument: !!session.requirementDocument,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      };
    }
  }

  return {
    success: false,
    error: '会话不存在',
  };
}
