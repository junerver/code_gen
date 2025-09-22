/**
 * @Description Requirements Conversation Composable
 * @Author Claude Code
 * @Date 2025-09-22
 *
 * 处理需求澄清对话的状态管理和API调用
 */

import { reactive, readonly, computed } from 'vue';

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

export interface RequirementsConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'clarification' | 'confirmation' | 'parsing' | 'document';
}

export interface RequirementsConversationState {
  conversationId: string;
  messages: RequirementsConversationMessage[];
  status: 'new' | 'clarifying' | 'confirmed' | 'parsing' | 'completed';
  confidence: number;
  requirementDocument?: any;
  isLoading: boolean;
  error: string | null;
}

export const useRequirementsConversation = () => {
  /**
   * 生成唯一ID
   */
  const generateId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  };

  const state = reactive<RequirementsConversationState>({
    conversationId: generateId(),
    messages: [],
    status: 'new',
    confidence: 0,
    requirementDocument: undefined,
    isLoading: false,
    error: null,
  });

  const addMessage = (message: RequirementsConversationMessage) => {
    state.messages.push(message);
  };

  const updateStatus = (status: string) => {
    state.status = status as any;
  };

  /**
   * 发送消息到需求对话API
   */
  const sendMessage = async (message: string, options?: { model?: string }) => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    state.isLoading = true;
    state.error = null;

    // 添加用户消息到本地状态
    const userMessage: RequirementsConversationMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    try {
      // 构建上下文信息
      const context = {
        domain: undefined as string | undefined,
        previousMessages: state.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      };

      const response = await $fetch<ConversationResponse>(
        '/api/requirements/clarification',
        {
          method: 'POST',
          body: {
            message,
            conversationId: state.conversationId,
            context,
            model: options?.model,
          } as ConversationRequest,
        }
      );

      if (response.success) {
        // 更新状态
        state.conversationId = response.conversationId;
        state.status = response.status as any;
        state.confidence = response.confidence || 0;

        // 添加助手消息到本地状态
        const assistantMessage: RequirementsConversationMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
          type: inferMessageType(response.status) as any,
        };
        addMessage(assistantMessage);

        // 如果对话完成，更新需求文档
        if (response.status === 'completed' && response.requirementDocument) {
          state.requirementDocument = response.requirementDocument;
        }

        return {
          success: true,
          response: response.response,
          status: response.status,
          clarificationQuestions: response.clarificationQuestions,
          requirementDocument: response.requirementDocument,
          confidence: response.confidence || 0,
        };
      } else {
        state.error = response.error || 'Failed to process message';
        return {
          success: false,
          response: '',
          error: response.error || 'Failed to process message',
          confidence: 0,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Network error occurred';
      state.error = errorMessage;
      console.error('Error sending message:', error);
      return {
        success: false,
        response: '',
        error: errorMessage,
        confidence: 0,
      };
    } finally {
      state.isLoading = false;
    }
  };

  /**
   * 根据状态推断消息类型
   */
  const inferMessageType = (status: string): string => {
    switch (status) {
      case 'clarifying':
        return 'clarification';
      case 'confirmed':
        return 'confirmation';
      case 'parsing':
        return 'parsing';
      case 'completed':
        return 'document';
      default:
        return 'clarification';
    }
  };

  /**
   * 重置对话
   */
  const resetConversation = () => {
    state.conversationId = generateId();
    state.messages = [];
    state.status = 'new';
    state.confidence = 0;
    state.requirementDocument = undefined;
    state.error = null;
  };

  /**
   * 开始新的需求会话
   */
  const startNewConversation = (
    initialMessage?: string,
    options?: { model?: string }
  ) => {
    resetConversation();
    if (initialMessage) {
      return sendMessage(initialMessage, options);
    }
    return Promise.resolve({ success: true, response: '', status: 'new' });
  };

  /**
   * 导出对话历史
   */
  const exportConversation = () => {
    return {
      conversationId: state.conversationId,
      messages: state.messages,
      status: state.status,
      confidence: state.confidence,
      requirementDocument: state.requirementDocument,
      exportedAt: new Date().toISOString(),
    };
  };

  /**
   * 获取需求摘要
   */
  const getRequirementSummary = computed(() => {
    if (!state.requirementDocument) {
      return null;
    }

    const doc = state.requirementDocument;
    return {
      entities: doc.entities?.length || 0,
      relationships: doc.relationships?.length || 0,
      businessRules: doc.businessRules?.length || 0,
      confidence: doc.confidence || 0,
      domain: doc.domain || 'unknown',
      complexity: doc.complexity || 'medium',
    };
  });

  /**
   * 检查是否可以开始业务建模
   */
  const canStartModeling = computed(() => {
    return (
      state.status === 'completed' &&
      state.requirementDocument &&
      state.confidence >= 0.7
    );
  });

  return {
    // State
    state: readonly(state),

    // Methods
    sendMessage,
    startNewConversation,
    resetConversation,
    exportConversation,

    // Computed
    getRequirementSummary,
    canStartModeling,
  };
};
