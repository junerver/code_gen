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

const adapter: AiChatAdapter = {
  // 模拟从服务端加载会话列表
  async loadConversations() {
    await delay(480);
    return mockConversations.map(item => ({ ...item }));
  },
  // 模拟按需拉取单个会话的历史消息
  async loadMessages(conversationId) {
    await delay(360);
    const list = mockMessages[conversationId] ?? [];
    return list.map(message => ({ ...message }));
  },
  // 模拟发送消息，返回助手回复；history 参数包含当前会话上下文
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
  // 模拟重新生成指定消息
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
  // 模拟清空会话
  async clearConversation(conversation) {
    await delay(240);
    mockMessages[conversation.id] = [];
    touchConversationMeta(conversation.id, '');
  },
};

async function streamMockAssistant(
  text: string,
  base: ChatMessage,
  onMessage?: (message: ChatMessage, meta: AiChatStreamMeta) => void
): Promise<ChatMessage> {
  if (onMessage) {
    console.log('🚀 [Mock] 开始流式响应:', text);
    // 如果有流式处理器，启动真正的流式响应
    onMessage({ ...base }, { phase: 'start' });
    let acc = '';
    for (const char of Array.from(text)) {
      await delay(80); // 增加延迟让流式效果更明显
      acc += char;
      // 添加 typing 状态，让组件显示正在输入的效果
      const streamingMessage = {
        ...base,
        content: acc,
        typing: true,
      };
      onMessage(streamingMessage, { phase: 'update' });
      console.log('🔤 [Mock] 发送字符:', char, '当前内容:', acc);
    }
    const result = { ...base, content: acc, typing: false };
    onMessage(result, { phase: 'complete' });
    console.log('✅ [Mock] 流式响应完成');
    return result;
  } else {
    // 如果没有流式处理器，直接返回完整响应
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
