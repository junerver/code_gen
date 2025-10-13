<template>
  <div class="preview-wrapper">
    <!--
      AiChatPanel 需要传入一个 adapter。
      这里只是模拟接口调用，真实项目可替换为实际 API。
    -->
    <AiChatPanel
      v-model="model"
      title="通用AI会话组件示例"
      placeholder="向AI提出一个问题..."
      :adapter="adapter"
      @message-send="handleMessageSend"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AiChatPanel } from '~/components/ai-chat';
import type {
  AiChatAdapter,
  AiChatStreamMeta,
  AiConversation,
} from '~/components/ai-chat/types';
import type { ChatMessage } from '~/types/chat';
import { DEFAULT_MODEL } from '#shared/types/model';

const model = ref(DEFAULT_MODEL);

const mockConversations = reactive<AiConversation[]>([
  {
    id: 'conv-1',
    title: '组件设计讨论',
    group: 'recent',
    lastMessage: '让我们拆解组件职责。',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'conv-2',
    title: 'API 对接规划',
    group: 'recent',
    lastMessage: '整理接口返回结构。',
    updatedAt: new Date().toISOString(),
  },
]);

const mockMessages = reactive<Record<string, ChatMessage[]>>({
  'conv-1': [
    createMockMessage('user', '我们需要一个通用的会话组件。'),
    createMockMessage(
      'assistant',
      '可以将会话列表、消息气泡和输入区拆成可配置的模块。'
    ),
  ],
  'conv-2': [
    createMockMessage('user', '接口的返回格式建议如何设计？'),
    createMockMessage(
      'assistant',
      '建议返回消息ID、角色、内容和可选的推理详情字段。'
    ),
  ],
});

/**
 * 真实接口适配器示例
 *
 * 这个适配器展示了如何对接真实的 AI 接口，请参考以下实现模式：
 *
 * ## 关键实现要点：
 *
 * 1. **流式响应处理**：当提供了 onMessage 回调时，必须实现真正的流式响应
 * 2. **立即返回策略**：适配器应该立即返回基础消息对象，不等待流式完成
 * 3. **错误处理**：正确处理网络错误和流式错误
 * 4. **数据持久化**：在流式完成后更新本地数据存储
 *
 * ## 对接真实接口的模板：
 *
 * ```typescript
 * const realAdapter: AiChatAdapter = {
 *   async loadConversations() {
 *     // 从后端 API 加载会话列表
 *     const response = await fetch('/api/conversations');
 *     return await response.json();
 *   },
 *
 *   async loadMessages(conversationId) {
 *     // 从后端 API 加载指定会话的消息
 *     const response = await fetch(`/api/conversations/${conversationId}/messages`);
 *     return await response.json();
 *   },
 *
 *   async sendMessage({ conversation, prompt, model, history, onMessage }) {
 *     // 调用真实的 AI API
 *     const response = await fetch('/api/chat', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         conversationId: conversation.id,
 *         prompt,
 *         model,
 *         history,
 *         stream: !!onMessage // 告诉后端是否需要流式响应
 *       })
 *     });
 *
 *     if (onMessage) {
 *       // 处理流式响应
 *       const reader = response.body?.getReader();
 *       const decoder = new TextDecoder();
 *       let accumulatedContent = '';
 *
 *       // 创建基础消息对象
 *       const baseMessage = createMockMessage('assistant', '');
 *
 *       while (true) {
 *         const { done, value } = await reader.read();
 *         if (done) break;
 *
 *         const chunk = decoder.decode(value);
 *         accumulatedContent += chunk;
 *
 *         // 调用流式更新回调
 *         onMessage({
 *           ...baseMessage,
 *           content: accumulatedContent,
 *           typing: true
 *         }, { phase: 'update' });
 *       }
 *
 *       // 流式完成
 *       onMessage({
 *         ...baseMessage,
 *         content: accumulatedContent,
 *         typing: false
 *       }, { phase: 'complete' });
 *
 *       return baseMessage;
 *     } else {
 *       // 非流式响应
 *       return await response.json();
 *     }
 *   }
 * };
 * ```
 */
const adapter: AiChatAdapter = {
  /**
   * 加载会话列表
   *
   * 真实实现：从后端 API 或数据库加载用户的会话列表
   */
  async loadConversations() {
    await delay(480);
    return mockConversations.map(item => ({ ...item }));
  },

  /**
   * 加载指定会话的消息历史
   *
   * 真实实现：从后端 API 加载指定会话的所有消息
   *
   * @param conversationId 会话ID
   * @returns Promise<ChatMessage[]> 消息列表
   */
  async loadMessages(conversationId) {
    await delay(360);
    const list = mockMessages[conversationId] ?? [];
    return list.map(message => ({ ...message }));
  },

  /**
   * 发送消息并获取助手回复
   *
   * 这是最核心的方法，展示了流式响应的正确实现模式：
   * 1. 创建基础消息对象并立即返回
   * 2. 启动流式响应处理（不等待）
   * 3. 流式完成后更新本地数据存储
   *
   * @param payload 发送参数
   * @param payload.conversation 会话信息
   * @param payload.prompt 用户输入内容
   * @param payload.model 使用的模型
   * @param payload.history 历史消息
   * @param payload.onMessage 流式更新回调（关键！）
   * @returns Promise<ChatMessage> 助手回复消息
   */
  async sendMessage({ conversation, prompt, history, onMessage }) {
    await delay(240);
    const base = createMockMessage('assistant', '');
    const finalText = '\u6a21\u62df\u54cd\u5e94\uff1a' + prompt;

    // 立即返回基础消息对象，实际内容通过流式更新
    if (onMessage) {
      // 启动流式响应并在完成时更新本地数据
      streamMockAssistant(finalText, base, onMessage)
        .then(result => {
          const historySnapshot = history.map(item => ({ ...item }));
          mockMessages[conversation.id] = [...historySnapshot, { ...result }];
          touchConversationMeta(conversation.id, result.content ?? '');
        })
        .catch(error => {
          console.error('Stream error:', error);
        });
      return base;
    } else {
      // 如果没有流式处理器，直接返回完整响应
      const streamed = await streamMockAssistant(finalText, base);
      const historySnapshot = history.map(item => ({ ...item }));
      mockMessages[conversation.id] = [...historySnapshot, { ...streamed }];
      touchConversationMeta(conversation.id, streamed.content ?? '');
      return streamed;
    }
  },

  /**
   * 重新生成指定消息的回复
   *
   * 实现逻辑与 sendMessage 类似，但是更新指定 ID 的消息
   *
   * @param payload 重新生成参数
   * @param payload.conversation 会话信息
   * @param payload.message 要重新生成的消息
   * @param payload.model 使用的模型
   * @param payload.history 历史消息
   * @param payload.onMessage 流式更新回调
   * @returns Promise<ChatMessage> 重新生成的消息
   */
  async regenerate({ conversation, message, history, onMessage }) {
    await delay(240);
    const base = createMockMessage('assistant', '');
    base.id = message.id;
    const finalText =
      '\u91cd\u65b0\u751f\u6210\u7ed3\u679c\uff1a' + (message.content ?? '');

    // 立即返回基础消息对象，实际内容通过流式更新
    if (onMessage) {
      // 启动流式响应并在完成时更新本地数据
      streamMockAssistant(finalText, base, onMessage)
        .then(result => {
          const source = (mockMessages[conversation.id] ?? history).map(
            item => ({
              ...item,
            })
          );
          const index = source.findIndex(item => item.id === message.id);
          if (index !== -1) {
            source.splice(index, 1, { ...result });
          } else {
            source.push({ ...result });
          }
          mockMessages[conversation.id] = source;
          touchConversationMeta(conversation.id, result.content ?? '');
        })
        .catch(error => {
          console.error('Stream error:', error);
        });
      return base;
    } else {
      // 如果没有流式处理器，直接返回完整响应
      const streamed = await streamMockAssistant(finalText, base);
      const source = (mockMessages[conversation.id] ?? history).map(item => ({
        ...item,
      }));
      const index = source.findIndex(item => item.id === message.id);
      if (index !== -1) {
        source.splice(index, 1, { ...streamed });
      } else {
        source.push({ ...streamed });
      }
      mockMessages[conversation.id] = source;
      touchConversationMeta(conversation.id, streamed.content ?? '');
      return streamed;
    }
  },

  /**
   * 清空指定会话的消息
   *
   * 真实实现：调用后端 API 清空会话数据
   *
   * @param conversation 要清空的会话
   */
  async clearConversation(conversation) {
    await delay(240);
    mockMessages[conversation.id] = [];
    touchConversationMeta(conversation.id, '');
  },
};

/**
 * 模拟流式助手响应
 *
 * 这个函数演示了如何实现真正的流式响应：
 * 1. 逐字符发送内容，模拟真实的 AI 响应过程
 * 2. 在流式期间设置 typing 状态，UI 显示输入指示器
 * 3. 流式完成后清除 typing 状态
 *
 * 真实接口实现时，应该替换为实际的流式数据读取逻辑
 *
 * @param text 要发送的完整文本
 * @param base 基础消息对象
 * @param onMessage 流式更新回调
 * @returns Promise<ChatMessage> 最终的完整消息
 */
async function streamMockAssistant(
  text: string,
  base: ChatMessage,
  onMessage?: (message: ChatMessage, meta: AiChatStreamMeta) => void
): Promise<ChatMessage> {
  if (onMessage) {
    console.log('🚀 [Mock] 开始流式响应:', text);

    // 流式响应开始：发送空消息，标记为 typing 状态
    onMessage({ ...base }, { phase: 'start' });

    let acc = '';

    // 逐字符流式发送内容
    for (const char of Array.from(text)) {
      await delay(80); // 增加延迟让流式效果更明显
      acc += char;

      // 创建流式消息对象，保持 typing 状态
      const streamingMessage = {
        ...base,
        content: acc,
        typing: true,
      };

      // 调用流式更新回调
      onMessage(streamingMessage, { phase: 'update' });
      console.log('🔤 [Mock] 发送字符:', char, '当前内容:', acc);
    }

    // 流式响应完成：清除 typing 状态
    const result = { ...base, content: acc, typing: false };
    onMessage(result, { phase: 'complete' });
    console.log('✅ [Mock] 流式响应完成');

    return result;
  } else {
    // 如果没有流式处理器，直接返回完整响应（向后兼容）
    console.log('📄 [Mock] 直接返回完整响应');
    await delay(60 * text.length); // 模拟相同的时间延迟
    return { ...base, content: text };
  }
}

function createMockMessage(
  role: ChatMessage['role'],
  content: string
): ChatMessage {
  return {
    id: cryptoRandomId(),
    role,
    content,
    timestamp: new Date(),
    placement: role === 'user' ? 'end' : 'start',
    avatar:
      role === 'user'
        ? 'https://avatars.githubusercontent.com/u/76239030?v=4'
        : 'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png',
    avatarSize: '32px',
    variant: role === 'user' ? 'outlined' : 'filled',
    maxWidth: '880px',
    typing: false,
    isMarkdown: role === 'assistant',
  };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function touchConversationMeta(conversationId: string, lastMessage: string) {
  const index = mockConversations.findIndex(item => item.id === conversationId);
  if (index !== -1) {
    const target = mockConversations[index];
    target.lastMessage = lastMessage;
    target.updatedAt = new Date().toISOString();
    mockConversations.splice(index, 1);
    mockConversations.unshift(target);
  }
}

function handleMessageSend({
  conversation,
  response,
}: {
  conversation: AiConversation;
  response: ChatMessage;
}) {
  ElMessage.success(
    `已在「${conversation.title}」收到回复：${response.content.slice(0, 12)}...`
  );
}
</script>

<style scoped>
.preview-wrapper {
  height: 100vh;
  padding: 32px;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  display: flex;
  justify-content: center;
  align-items: stretch;
  overflow: auto;
}

.preview-wrapper :deep(.ai-chat-panel) {
  width: 100%;
  max-width: 1280px;
}
</style>
