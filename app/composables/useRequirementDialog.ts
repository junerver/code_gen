/**
 * @Description 需求对话组合式函数 - 支持新的API结构
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { ref, computed, reactive } from 'vue';
import type {
  RequirementDialogRequest,
  RequirementDialogResponse,
  DialogContext,
  DialogState,
  RequirementDocument,
  CompletenessScore,
} from '#shared/types/requirement';
import type { ChatMessage } from '#shared/types/chat';
import type { AvailableModelNames } from '#shared/types/model';

export interface RequirementDialogOptions {
  /** 初始领域 */
  domain?: string;
  /** 使用的模型 */
  model?: AvailableModelNames;
  /** API端点 */
  apiEndpoint?: string;
}

export const useRequirementDialog = (
  options: RequirementDialogOptions = {}
) => {
  // 基础状态
  const loading = ref(false);
  const error = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const conversationId = ref<string>(`req_${Date.now()}`);

  // 对话上下文状态
  const dialogContext = reactive<DialogContext>({
    domain: options.domain,
    previousRequirements: [],
    userAnswers: {},
    sessionId: conversationId.value,
    currentPhase: 'collecting',
    completeness: 0,
  });

  // 当前状态
  const currentPhase = computed(() => dialogContext.currentPhase);
  const completeness = computed(() => dialogContext.completeness || 0);
  const isDialogCompleted = computed(() => currentPhase.value === 'completed');

  // 生成的需求文档
  const requirementDocument = ref<RequirementDocument | null>(null);

  // 建议和问题
  const suggestions = ref<string[]>([]);
  const nextQuestions = ref<string[]>([]);

  /**
   * 添加消息到对话历史
   */
  const addMessage = (role: 'user' | 'assistant', content: string): string => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: ChatMessage = {
      id: messageId,
      role,
      content,
      timestamp: new Date(),
    };

    messages.value.push(message);
    return messageId;
  };

  /**
   * 更新助手消息内容（流式更新）
   */
  const updateAssistantMessage = (
    messageId: string,
    content: string,
    done = false
  ) => {
    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex >= 0) {
      messages.value[messageIndex].content = content;
      if (done) {
        messages.value[messageIndex].metadata = {
          ...messages.value[messageIndex].metadata,
          processingTime: Date.now(),
        };
      }
    }
  };

  /**
   * 发送消息并获取AI回复
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      // 添加用户消息
      addMessage('user', content);

      // 更新用户回答记录（简单解析）
      const lastQuestion = getLastBotQuestion();
      if (lastQuestion) {
        dialogContext.userAnswers = {
          ...dialogContext.userAnswers,
          [lastQuestion]: content,
        };
      }

      // 构建请求
      const request: RequirementDialogRequest = {
        messages: messages.value.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        model: options.model,
        conversationId: conversationId.value,
        context: { ...dialogContext },
      };

      // 发送请求到流式API
      const response = await fetch(
        options.apiEndpoint || '/api/requirements/dialog',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`
        );
      }

      // 创建助手消息用于流式更新
      const assistantMessageId = addMessage('assistant', '');

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              // 处理文本增量
              if (data.type === 'text-delta' && data.delta) {
                accumulatedContent += data.delta;
                updateAssistantMessage(assistantMessageId, accumulatedContent);
              }

              // 处理工具调用结果
              if (data.type === 'tool-output-available' && data.result) {
                await handleToolResult(data.toolName, data.result);
              }
            } catch (parseError) {
              console.warn('解析流数据失败:', parseError);
            }
          }
        }
      }

      // 完成流式响应
      updateAssistantMessage(assistantMessageId, accumulatedContent, true);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发送消息失败';
      console.error('需求对话失败:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 处理工具调用结果
   */
  const handleToolResult = async (toolName: string, result: any) => {
    switch (toolName) {
      case 'assessCompleteness':
        if (result.success && result.completeness) {
          updateCompleteness(result.completeness);
          if (result.nextPhase) {
            updateDialogPhase(result.nextPhase);
          }
        }
        break;

      case 'generateQuestions':
        if (result.success && result.questions) {
          nextQuestions.value = result.questions.map(
            (q: any) => q.question || q
          );
        }
        break;

      case 'generateDocument':
        if (result.success && result.document) {
          requirementDocument.value = result.document;
          dialogContext.currentPhase = 'completed';
        }
        break;

      case 'processDialog':
        if (result.success && result.response) {
          const dialogResponse = result.response as RequirementDialogResponse;
          updateDialogState(dialogResponse);

          if (result.context) {
            Object.assign(dialogContext, result.context);
          }
        }
        break;
    }
  };

  /**
   * 更新对话状态
   */
  const updateDialogState = (response: RequirementDialogResponse) => {
    dialogContext.currentPhase = response.dialogState;

    if (response.completeness !== undefined) {
      dialogContext.completeness = response.completeness;
    }

    if (response.nextQuestions) {
      nextQuestions.value = response.nextQuestions;
    }

    if (response.suggestions) {
      suggestions.value = response.suggestions;
    }

    if (response.requirementDocument) {
      requirementDocument.value = response.requirementDocument;
    }
  };

  /**
   * 更新完整性评分
   */
  const updateCompleteness = (score: CompletenessScore) => {
    dialogContext.completeness = score.overall;
    suggestions.value = score.recommendations || [];
  };

  /**
   * 更新对话阶段
   */
  const updateDialogPhase = (phase: DialogState) => {
    dialogContext.currentPhase = phase;
  };

  /**
   * 获取最后一个机器人问题
   */
  const getLastBotQuestion = (): string | null => {
    const lastAssistantMessage = [...messages.value]
      .reverse()
      .find(m => m.role === 'assistant');

    if (!lastAssistantMessage) return null;

    // 简单地提取问号结尾的句子作为问题
    const sentences = lastAssistantMessage.content.split(/[。！？]/);
    const question = sentences.find(s => s.includes('？') || s.includes('?'));

    return question?.trim() || null;
  };

  /**
   * 重置对话状态
   */
  const resetDialog = () => {
    messages.value = [];
    conversationId.value = `req_${Date.now()}`;
    requirementDocument.value = null;
    suggestions.value = [];
    nextQuestions.value = [];
    error.value = null;

    // 重置上下文但保留领域设置
    const originalDomain = dialogContext.domain;
    Object.assign(dialogContext, {
      domain: originalDomain,
      previousRequirements: [],
      userAnswers: {},
      sessionId: conversationId.value,
      currentPhase: 'collecting',
      completeness: 0,
    });
  };

  /**
   * 设置领域
   */
  const setDomain = (domain: string) => {
    dialogContext.domain = domain;
  };

  /**
   * 获取对话摘要
   */
  const getDialogSummary = () => {
    const userMessages = messages.value.filter(m => m.role === 'user');
    const requirements = userMessages.map(m => m.content).join(' ');

    return {
      totalMessages: messages.value.length,
      userMessages: userMessages.length,
      currentPhase: currentPhase.value,
      completeness: completeness.value,
      domain: dialogContext.domain,
      extractedRequirements:
        requirements.slice(0, 500) + (requirements.length > 500 ? '...' : ''),
      hasDocument: !!requirementDocument.value,
    };
  };

  /**
   * 导出对话数据
   */
  const exportDialogData = () => {
    return {
      conversationId: conversationId.value,
      messages: messages.value,
      context: dialogContext,
      document: requirementDocument.value,
      summary: getDialogSummary(),
      exportTime: new Date().toISOString(),
    };
  };

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),
    messages: readonly(messages),
    conversationId: readonly(conversationId),

    // 对话状态
    currentPhase,
    completeness,
    isDialogCompleted,
    dialogContext: readonly(dialogContext),

    // 结果
    requirementDocument: readonly(requirementDocument),
    suggestions: readonly(suggestions),
    nextQuestions: readonly(nextQuestions),

    // 方法
    sendMessage,
    resetDialog,
    setDomain,
    getDialogSummary,
    exportDialogData,

    // 状态更新方法（供内部使用）
    updateDialogState,
    updateCompleteness,
    updateDialogPhase,
  };
};
