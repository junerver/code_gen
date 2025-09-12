import { computed, readonly, ref } from 'vue';
import type { ChatMessage } from '~/types/chat';
import type { IConversationRepository } from '~/types/conv-repos';
import { PiniaConversationRepository } from '~/utils/pinia-conv-repos';
import { type AvailableModelNames, DEFAULT_MODEL } from '#shared/types/model';

/**
 * 聊天功能组合式函数
 * @param repository 会话存储仓库实例，用于管理会话和消息数据
 * @returns 聊天相关的状态和方法
 */
export const useChat = (repository?: IConversationRepository) => {
  // 获取会话存储 - 支持依赖注入，优先使用传入的repository
  const conversationStore = repository || new PiniaConversationRepository();
  // llm是否处于回复中，用于禁用sender组件
  const loading = ref(false);
  const error = ref<string | undefined>();
  // 模型选择，填入的是模型的名称，对应在模型提供器中的命名
  const selectedModel = ref<AvailableModelNames>(DEFAULT_MODEL);

  // 从store获取当前会话的消息
  const messages = computed(() => conversationStore.activeMessages);
  const activeConversation = computed(
    () => conversationStore.activeConversation
  );

  /**
   * 添加用户消息到当前会话
   * @param content 消息内容
   */
  const addUserMessage = (content: string): void => {
    if (!conversationStore.activeConversationId) {
      conversationStore.initializeDefaultConversation();
    }

    // 检查是否为该会话的第一条消息
    const currentMessages = conversationStore.getMessages(
      conversationStore.activeConversationId
    );
    const isFirstMessage = currentMessages.length === 0;
    // 构建用户消息
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'user',
      timestamp: new Date(),
      typing: false,
      isMarkdown: false,
      shape: 'corner',
    };
    // 存储用户消息到会话中
    conversationStore.addMessage(
      conversationStore.activeConversationId,
      message
    );

    // 如果是第一条消息，更新会话标题
    if (isFirstMessage) {
      // 截取前30个字符作为标题，避免标题过长
      const title =
        content.length > 30 ? content.slice(0, 30) + '...' : content;
      // 更新会话标题
      conversationStore.updateConversation(
        conversationStore.activeConversationId,
        { title }
      );
    }
  };

  /**
   * 添加助手消息到当前会话
   * @param content 消息内容
   */
  const addAssistantMessage = (content: string = ''): string => {
    if (!conversationStore.activeConversationId) {
      conversationStore.initializeDefaultConversation();
    }

    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'assistant',
      timestamp: new Date(),
      typing: { step: 5, interval: 35, suffix: '|' },
      isMarkdown: true,
      shape: 'corner',
      loading: true,
    };
    conversationStore.addMessage(
      conversationStore.activeConversationId,
      message
    );
    return message.id;
  };

  /**
   * 更新当前会话中的助手消息内容
   * @param messageId 消息ID
   * @param content 新的消息内容
   * @param done 是否流式响应完毕
   */
  const updateAssistantMessage = (
    messageId: string,
    content: string,
    done: boolean = false
  ): void => {
    if (conversationStore.activeConversationId) {
      conversationStore.updateMessage(
        conversationStore.activeConversationId,
        messageId,
        content,
        done
      );
    }
  };

  /**
   * 生成AI回复的核心逻辑
   * @returns 生成的回复内容
   */
  const generateResponse = async (): Promise<string> => {
    // 调用流式API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel.value,
        messages: messages.value.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });
    const assistantMessageId = addAssistantMessage();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let reasoningContent = '';
    let toolsCallingContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const jsonStr = line.slice(6); // 移除 'data: ' 前缀
            const data = JSON.parse(jsonStr);

            // 处理 assistant 的 text-delta 类型数据（正文）
            if (data.type === 'text-delta' && data.delta) {
              accumulatedContent += data.delta;
              updateAssistantMessage(assistantMessageId, accumulatedContent);
            }
            // 处理 reasoning 的 text-delta 类型数据（推理）
            if (data.type === 'reasoning-start' && data.delta) {
              reasoningContent = '';
              conversationStore.updateMessageReasoning(
                conversationStore.activeConversationId,
                assistantMessageId,
                reasoningContent,
                'start'
              );
            }
            // 推理正文
            if (data.type === 'reasoning-delta' && data.delta) {
              reasoningContent += data.delta;
              conversationStore.updateMessageReasoning(
                conversationStore.activeConversationId,
                assistantMessageId,
                reasoningContent,
                'thinking'
              );
            }
            // 正式响应时推理结束
            if (data.type === 'text-start' && reasoningContent) {
              conversationStore.updateMessageReasoning(
                conversationStore.activeConversationId,
                assistantMessageId,
                reasoningContent,
                'end'
              );
            }
            if (data.type === 'tool-input-start') {
              // 工具开始执行，清空工具消息
              accumulatedContent += `\n> #### 工具调用：\n> - 开始执行工具调用：\`${data.toolName}\`\n`;
              updateAssistantMessage(assistantMessageId, accumulatedContent);
              toolsCallingContent = '';
            }
            if (data.type === 'tool-input-delta') {
              // 拼接工具输入参数的delta
              toolsCallingContent += data.inputTextDelta;
            }
            if (data.type === 'tool-input-available') {
              // 执行工具调用
              accumulatedContent += `> - 工具输入参数：\`${toolsCallingContent}\`\n`;
              updateAssistantMessage(assistantMessageId, accumulatedContent);
            }
            if (data.type === 'tool-output-available') {
              // 工具调用完毕，拼接工具输出
              accumulatedContent += `> - 工具调用结果：${data.isError ? '**错误**' : '**成功**'}\n\n`;
              updateAssistantMessage(assistantMessageId, accumulatedContent);
            }
          } catch (parseError) {
            console.warn('解析流数据失败:', parseError, '原始行:', line);
          }
        }
      }
    }

    // 流式响应完成，确保typing状态被设置为false
    updateAssistantMessage(assistantMessageId, accumulatedContent, true);

    return accumulatedContent;
  };

  /**
   * 发送消息到服务器
   * @param content 消息内容
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    loading.value = true;
    error.value = undefined;

    try {
      // 添加用户消息
      addUserMessage(content);

      // 生成回复
      await generateResponse();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发送消息失败';
      console.error('发送消息失败:', err);

      // 如果出错，处理助手消息状态
      if (conversationStore.activeConversationId) {
        const currentMessages = conversationStore.getMessages(
          conversationStore.activeConversationId
        );
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (currentMessages.length > 0 && lastMessage?.role === 'assistant') {
          if (lastMessage.content === '') {
            // 如果消息为空，删除消息
            conversationStore.deleteMessage(
              conversationStore.activeConversationId,
              lastMessage.id
            );
          } else {
            // 如果消息有内容，确保typing和loading状态为false
            conversationStore.updateMessage(
              conversationStore.activeConversationId,
              lastMessage.id,
              lastMessage.content,
              true
            );
          }
        }
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 重新生成指定消息及其之后的回复
   * @param messageId 要重新生成的消息ID
   */
  const regenerate = async (messageId: string): Promise<void> => {
    if (!conversationStore.activeConversationId) return;

    loading.value = true;
    error.value = undefined;

    try {
      // 获取当前会话的所有消息
      const currentMessages = conversationStore.getMessages(
        conversationStore.activeConversationId
      );

      // 找到指定消息的索引
      const messageIndex = currentMessages.findIndex(
        msg => msg.id === messageId
      );
      if (messageIndex === -1) {
        throw new Error('未找到指定的消息');
      }

      // 删除指定消息及其之后的所有消息
      const messagesToDelete = currentMessages.slice(messageIndex);
      for (const msg of messagesToDelete) {
        conversationStore.deleteMessage(
          conversationStore.activeConversationId,
          msg.id
        );
      }

      // 生成新的回复
      await generateResponse();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重新生成失败';
      console.error('重新生成失败:', err);

      // 如果出错，处理助手消息状态
      if (conversationStore.activeConversationId) {
        const currentMessages = conversationStore.getMessages(
          conversationStore.activeConversationId
        );
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (currentMessages.length > 0 && lastMessage?.role === 'assistant') {
          if (lastMessage.content === '') {
            // 如果消息为空，删除消息
            conversationStore.deleteMessage(
              conversationStore.activeConversationId,
              lastMessage.id
            );
          } else {
            // 如果消息有内容，确保typing和loading状态为false
            conversationStore.updateMessage(
              conversationStore.activeConversationId,
              lastMessage.id,
              lastMessage.content
            );
          }
        }
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 清空当前会话的聊天记录
   */
  const clearMessages = (): void => {
    if (conversationStore.activeConversationId) {
      conversationStore.clearMessages(conversationStore.activeConversationId);
    }
    error.value = undefined;
  };

  /**
   * 删除当前会话中的指定消息
   * @param messageId 消息ID
   */
  const deleteMessage = (messageId: string): void => {
    if (conversationStore.activeConversationId) {
      conversationStore.deleteMessage(
        conversationStore.activeConversationId,
        messageId
      );
    }
  };

  return {
    // 只读状态
    messages,
    activeConversation,
    loading: readonly(loading),
    error: readonly(error),
    selectedModel,

    // 会话仓库引用（接口类型）
    repository: conversationStore,

    // 方法
    sendMessage,
    regenerate,
    clearMessages,
    deleteMessage,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage,
  };
};
