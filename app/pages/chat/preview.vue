<template>
  <div class="preview-wrapper">
    <AiChatPanel
      v-model="model"
      title="通用AI会话组件示例"
      placeholder="向AI提出一个问题..."
      :initial-conversations="initialConversations"
      :initial-messages="initialMessages"
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
  AiConversation,
  ConversationMessageMap,
} from '~/components/ai-chat/types';
import type { ChatMessage } from '~/types/chat';
import { DEFAULT_MODEL } from '#shared/types/model';

const model = ref(DEFAULT_MODEL);

const initialConversations: AiConversation[] = [
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
];

const initialMessages = reactive<ConversationMessageMap>({
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
  async sendMessage({ prompt }) {
    await delay(420);
    return createMockMessage(
      'assistant',
      `这里是模拟响应：${prompt}。可以在外部替换成真实接口。`
    );
  },
  async regenerate({ message }) {
    await delay(360);
    return createMockMessage(
      'assistant',
      `重新生成的回答：我们可以进一步优化「${message.content}」。`
    );
  },
};

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
