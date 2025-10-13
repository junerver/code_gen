<template>
  <div class="ai-chat-panel">
    <div class="sidebar">
      <div v-if="conversationsLoading" class="sidebar-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <Conversations
        v-else
        v-model:active="activeConversationId"
        :items="conversationItems"
        class="conversation-list"
        row-key="id"
        groupable
        :tooltip-offset="24"
        tooltip-placement="right"
        @change="handleConversationChange"
      >
        <template #header>
          <div class="sidebar-header">
            <h3>{{ title }}</h3>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="createConversation"
            >
              新建对话
            </el-button>
          </div>
        </template>
      </Conversations>
    </div>

    <div class="chat-area">
      <el-header class="chat-header">
        <div class="header-content">
          <div class="header-title">
            <el-icon>
              <ChatDotRound />
            </el-icon>
            <span>{{ title }}</span>
          </div>
          <div class="header-actions">
            <ModelSelect v-model="modelValue" class="model-select" />
            <el-button
              type="danger"
              size="small"
              :icon="Delete"
              :disabled="
                !currentMessages.length ||
                loading ||
                messagesLoading ||
                conversationsLoading
              "
              @click="handleClear"
            >
              清空对话
            </el-button>
          </div>
        </div>
      </el-header>

      <div class="chat-main">
        <div ref="messagesContainer" class="messages-container">
          <el-skeleton
            v-if="messagesLoading"
            :rows="6"
            animated
            class="messages-skeleton"
          />
          <el-empty
            v-else-if="!currentMessages.length"
            description="开始新的对话吧"
          >
            <template #image>
              <el-icon size="56" color="#409EFF">
                <ChatDotRound />
              </el-icon>
            </template>
          </el-empty>
          <BubbleList v-else max-height="100%" :list="currentMessages">
            <template #content="{ item }">
              <div v-if="item.role === 'assistant'">
                <!-- 流式响应时显示 typing 状态 -->
                <div v-if="item.typing" class="typing-indicator">
                  <span class="typing-text">{{ item.content }}</span>
                  <span class="typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
                <XMarkdown
                  v-else
                  :markdown="String(item.content ?? '')"
                  class="bubble-markdown"
                />
              </div>
              <p v-else class="bubble-text">{{ item.content }}</p>
            </template>
            <template #footer="{ item }">
              <el-tooltip
                v-if="
                  canRegenerate && item.role === 'assistant' && !item.typing
                "
                content="重新生成"
                placement="bottom"
              >
                <el-button
                  size="small"
                  type="primary"
                  circle
                  :icon="Refresh"
                  @click="handleRegenerate(item)"
                />
              </el-tooltip>
            </template>
          </BubbleList>
        </div>
      </div>

      <div class="chat-footer">
        <Sender
          v-model="inputValue"
          :disabled="loading || messagesLoading || conversationsLoading"
          :placeholder="placeholder"
          class="sender"
          clearable
          :auto-size="senderAutoSize"
          variant="updown"
          @submit="handleSend"
        >
          <template #prefix>
            <ModelSelect v-model="modelValue" />
          </template>
        </Sender>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      closable
      class="chat-error"
      @close="errorMessage = undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import {
  BubbleList,
  Conversations,
  Sender,
  XMarkdown,
} from 'vue-element-plus-x';
import type { ConversationItem } from 'vue-element-plus-x/types/Conversations';
import { ChatDotRound, Delete, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import ModelSelect from '../ModelSelect.vue';
import type { ChatMessage } from '~/types/chat';
import { DEFAULT_MODEL, type AvailableModelNames } from '#shared/types/model';
import type {
  AiChatAdapter,
  AiChatPanelProps,
  AiConversation,
  AiChatStreamMeta,
  ConversationMessageMap,
} from './types';
import type { BubbleProps } from 'vue-element-plus-x/types/Bubble';

const props = withDefaults(defineProps<AiChatPanelProps>(), {
  title: 'AI 会话',
  placeholder: '请输入您的问题...',
  initialConversations: () => [] as AiConversation[],
  initialMessages: () => ({}) as ConversationMessageMap,
  avatars: () => ({
    user: 'https://avatars.githubusercontent.com/u/76239030?v=4',
    assistant:
      'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png',
  }),
});

const emit = defineEmits<{
  'conversation-create': [conversation: AiConversation];
  'conversation-change': [conversation: AiConversation];
  'message-send': [
    payload: {
      conversation: AiConversation;
      request: ChatMessage;
      response: ChatMessage;
    },
  ];
  clear: [conversation: AiConversation];
  update: [value: AvailableModelNames];
}>();

const modelValue = defineModel<AvailableModelNames>({ default: DEFAULT_MODEL });

const title = computed(() => props.title);
const placeholder = computed(() => props.placeholder);
const avatars = computed(() => props.avatars);

const loading = ref(false);
const errorMessage = ref<string>();
const inputValue = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const senderAutoSize = {
  minRows: 3,
  maxRows: 7,
};
const conversationsLoading = ref(false);
const messagesLoading = ref(false);
const pendingMessageRequest = ref<string | null>(null);
const loadedConversations = new Set<string>();
const shouldAutoLoadConversations = computed(
  () => props.autoLoadConversations !== false
);

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function createConversationMeta(titleText: string): AiConversation {
  const now = new Date();
  return {
    id: createId(),
    title: titleText,
    group: 'recent',
    lastMessage: '',
    updatedAt: now.toISOString(),
  };
}

const conversations = ref<AiConversation[]>(
  normalizeInitialConversations(buildInitialConversations())
);
const messageMap = reactive<ConversationMessageMap>(
  buildInitialMessages(conversations.value)
);

let initialConversation = conversations.value[0];
if (!initialConversation) {
  initialConversation = createConversationMeta('默认对话');
  conversations.value.push(initialConversation);
}

const activeConversationId = ref<string>(initialConversation.id);

const fallbackAdapter = createFallbackAdapter();
const adapter = computed<AiChatAdapter>(() => props.adapter ?? fallbackAdapter);
const canRegenerate = computed(() => Boolean(adapter.value.regenerate));

const conversationItems = computed<ConversationItem<AiConversation>[]>(() =>
  conversations.value.map(item => ({
    ...item,
    label: item.title,
    group: item.group ?? 'recent',
    timestamp: item.updatedAt,
  }))
);

const currentConversation = computed<AiConversation | null>(() => {
  const match = conversations.value.find(
    item => item.id === activeConversationId.value
  );
  if (match) return match;
  return conversations.value[0] ?? null;
});

const currentMessages = computed<ChatMessage[]>(() => {
  const id = activeConversationId.value;
  const messages = ensureMessages(id);
  // 强制更新计算属性，确保响应式更新
  return messages.map(msg => ({ ...msg }));
});

function applyConversations(
  list: AiConversation[],
  options: { resetLoaded?: boolean } = {}
) {
  const normalized = normalizeInitialConversations(list);
  conversations.value = normalized;
  if (options.resetLoaded) {
    loadedConversations.clear();
  }
  const idSet = new Set(normalized.map(item => item.id));
  for (const key of Object.keys(messageMap)) {
    if (!idSet.has(key)) {
      delete messageMap[key];
    }
  }
  normalized.forEach(item => {
    ensureMessages(item.id);
  });
  const hasActive = normalized.some(
    item => item.id === activeConversationId.value
  );
  if (!hasActive && normalized.length > 0) {
    activeConversationId.value = normalized[0].id;
  }
  if (list.length === 0 && normalized.length === 1) {
    loadedConversations.add(normalized[0].id);
  }
}

function applyInitialMessages(map: ConversationMessageMap | undefined) {
  if (!map) return;
  Object.keys(map).forEach(key => {
    const messages = map[key] ?? [];
    messageMap[key] = messages.map(message => ({ ...message }));
    loadedConversations.add(key);
  });
}

function requireActiveConversation(): AiConversation {
  const existing = currentConversation.value;
  if (existing) {
    ensureMessages(existing.id);
    loadedConversations.add(existing.id);
    return existing;
  }

  const fallback = createConversationMeta('默认对话');
  conversations.value.push(fallback);
  activeConversationId.value = fallback.id;
  ensureMessages(fallback.id);
  loadedConversations.add(fallback.id);
  return fallback;
}

async function refreshConversations() {
  if (!props.adapter?.loadConversations || !shouldAutoLoadConversations.value) {
    const base = props.initialConversations ?? conversations.value;
    applyConversations(base.map(item => ({ ...item })));
    if (!props.adapter?.loadMessages) {
      applyInitialMessages(props.initialMessages);
    }
    return;
  }

  conversationsLoading.value = true;
  try {
    const fetched = await props.adapter.loadConversations();
    const copied = (fetched ?? []).map(item => ({ ...item }));
    applyConversations(copied, { resetLoaded: true });
  } catch (error) {
    errorMessage.value = (error as Error).message ?? '会话加载失败，请稍后重试';
  } finally {
    conversationsLoading.value = false;
  }
}

async function loadMessagesForConversation(
  conversationId: string,
  options: { force?: boolean } = {}
) {
  if (!conversationId) return;
  if (!options.force && loadedConversations.has(conversationId)) {
    return;
  }

  const loader = props.adapter?.loadMessages;
  if (!loader) {
    if (props.initialMessages?.[conversationId]) {
      const messages = props.initialMessages[conversationId] ?? [];
      messageMap[conversationId] = messages.map(message => ({ ...message }));
    }
    ensureMessages(conversationId);
    loadedConversations.add(conversationId);
    return;
  }

  pendingMessageRequest.value = conversationId;
  messagesLoading.value = true;
  try {
    const response = await loader(conversationId);
    if (pendingMessageRequest.value !== conversationId) return;
    messageMap[conversationId] = (response ?? []).map(message => ({
      ...message,
    }));
    loadedConversations.add(conversationId);
  } catch (error) {
    if (pendingMessageRequest.value === conversationId) {
      errorMessage.value =
        (error as Error).message ?? '消息加载失败，请稍后重试';
    }
  } finally {
    if (pendingMessageRequest.value === conversationId) {
      messagesLoading.value = false;
      pendingMessageRequest.value = null;
    }
  }
}

watch(
  () => props.initialConversations,
  newVal => {
    if (shouldAutoLoadConversations.value && props.adapter?.loadConversations) {
      return;
    }
    const list = (newVal ?? []).map(item => ({ ...item }));
    applyConversations(list);
    if (!props.adapter?.loadMessages) {
      applyInitialMessages(props.initialMessages);
    }
  }
);

watch(
  () => props.initialMessages,
  newVal => {
    if (props.adapter?.loadMessages) return;
    applyInitialMessages(newVal);
    ensureMessages(activeConversationId.value);
  }
);

watch(currentMessages, () => {
  nextTick(scrollToBottom);
});

watch(
  modelValue,
  value => {
    emit('update', value);
  },
  { flush: 'post' }
);

watch(activeConversationId, id => {
  if (!id) return;
  void loadMessagesForConversation(id);
});

onMounted(async () => {
  await refreshConversations();
  await loadMessagesForConversation(activeConversationId.value, {
    force: true,
  });
});

function buildInitialConversations(): AiConversation[] {
  if (props.initialConversations?.length) {
    return props.initialConversations.map(item => ({ ...item }));
  }
  return [createConversationMeta('默认对话')];
}

function normalizeInitialConversations(
  list: AiConversation[]
): AiConversation[] {
  if (list.length) return list;
  return [createConversationMeta('默认对话')];
}

function buildInitialMessages(list: AiConversation[]): ConversationMessageMap {
  const seed: ConversationMessageMap = {};
  if (props.initialMessages) {
    for (const key of Object.keys(props.initialMessages)) {
      const messages = props.initialMessages[key] ?? [];
      seed[key] = messages.map(message => ({ ...message }));
    }
  }
  for (const item of list) {
    if (!seed[item.id]) {
      seed[item.id] = [];
    }
  }
  return seed;
}

function ensureMessages(conversationId: string): ChatMessage[] {
  if (!messageMap[conversationId]) {
    messageMap[conversationId] = [];
  }
  return messageMap[conversationId];
}

function createMessage(payload: {
  role: ChatMessage['role'];
  content: string;
  overrides?: Partial<BubbleProps>;
}): ChatMessage {
  const isUser = payload.role === 'user';
  return {
    id: createId(),
    role: payload.role,
    content: payload.content,
    timestamp: new Date(),
    placement: isUser ? 'end' : 'start',
    avatar: isUser ? avatars.value.user : avatars.value.assistant,
    avatarSize: '32px',
    variant: isUser ? 'outlined' : 'filled',
    maxWidth: '880px',
    typing: false,
    isMarkdown: !isUser,
    ...payload.overrides,
  };
}

function normalizeAssistantMessage(message: ChatMessage): ChatMessage {
  const base = createMessage({
    role: 'assistant',
    content: message.content ?? '',
  });
  return {
    ...base,
    ...message,
    id: message.id ?? base.id,
    timestamp: message.timestamp ? new Date(message.timestamp) : base.timestamp,
    placement: 'start',
    avatar: avatars.value.assistant,
    avatarSize: '32px',
    variant: 'filled',
    isMarkdown: true,
    // 保持流式更新的状态
    typing: message.typing ?? false,
  };
}

function updateConversationMeta(conversation: AiConversation, text: string) {
  conversation.lastMessage = text;
  conversation.updatedAt = new Date().toISOString();
}

/**
 * 处理用户发送消息
 *
 * 这个方法是整个聊天流程的核心入口，负责：
 * 1. 验证输入和状态
 * 2. 创建用户消息并添加到消息列表
 * 3. 调用适配器发送消息并处理流式响应
 * 4. 更新UI状态和会话元数据
 *
 * @param message 可选的消息内容，如果不提供则使用输入框的值
 */
async function handleSend(message?: string) {
  // 状态检查：防止重复请求和在加载过程中发送新消息
  if (loading.value || messagesLoading.value) return;

  // 获取并验证消息内容
  const content = (message ?? inputValue.value).trim();
  if (!content) return;

  // 获取当前活跃会话并确保消息列表存在
  const conversation = requireActiveConversation();
  const targetMessages = ensureMessages(conversation.id);

  // 创建并添加用户消息
  const requestMessage = createMessage({ role: 'user', content });
  targetMessages.push(requestMessage);
  updateConversationMeta(conversation, content);

  // 重置UI状态
  inputValue.value = '';
  loading.value = true;
  errorMessage.value = undefined;

  let responseMessage: ChatMessage | null = null;

  /**
   * 流式更新处理器
   *
   * 这个函数会被适配器在流式响应过程中多次调用：
   * - phase 'start': 流式响应开始
   * - phase 'update': 内容更新（可能多次调用）
   * - phase 'complete': 流式响应结束
   *
   * 关键点：
   * 1. 使用对象替换而非属性更新来确保Vue响应式
   * 2. 正确处理首次创建和后续更新的不同逻辑
   * 3. 维护responseMessage引用以便后续更新
   *
   * @param incoming 来自适配器的流式消息数据
   * @param meta 流式响应元数据，包含当前阶段信息
   */
  const applyStreamUpdate = (incoming: ChatMessage, meta: AiChatStreamMeta) => {
    const normalized = normalizeAssistantMessage(incoming);

    if (!responseMessage) {
      // 首次创建助手消息
      responseMessage = normalized;
      targetMessages.push(responseMessage);
      console.log(
        '📝 [Stream] 创建新消息:',
        normalized.content?.substring(0, 50),
        'typing:',
        normalized.typing
      );
    } else {
      // 更新现有消息内容（关键：必须替换整个对象以触发Vue响应式）
      const index = targetMessages.findIndex(
        msg => msg.id === responseMessage?.id
      );
      if (index !== -1) {
        targetMessages[index] = { ...responseMessage, ...normalized };
        console.log(
          '📝 [Stream] 更新消息:',
          normalized.content?.substring(0, 50),
          'typing:',
          normalized.typing
        );
      }
    }

    // 更新会话元数据和UI状态
    updateConversationMeta(conversation, responseMessage.content ?? '');
    void nextTick(scrollToBottom);

    // 流式响应完成时的处理
    if (meta.phase === 'complete' && responseMessage) {
      console.log('📝 [Stream] 流式响应完成');
      emit('message-send', {
        conversation,
        request: requestMessage,
        response: responseMessage,
      });
    }
  };

  try {
    // 调用适配器发送消息
    const responseRaw = await adapter.value.sendMessage({
      conversation,
      prompt: content,
      model: modelValue.value,
      history: [...targetMessages], // 传递当前完整的消息历史
      onMessage: applyStreamUpdate, // 流式更新回调
    });

    // 兼容性处理：如果适配器没有使用流式处理，手动处理返回的完整消息
    // 这主要是为了向后兼容非流式适配器
    if (!responseMessage) {
      const finalResponse = normalizeAssistantMessage(responseRaw);
      responseMessage = finalResponse;
      targetMessages.push(responseMessage);
      updateConversationMeta(conversation, finalResponse.content ?? '');
      emit('message-send', {
        conversation,
        request: requestMessage,
        response: finalResponse,
      });
    }
  } catch (error) {
    // 错误处理：显示错误信息给用户
    errorMessage.value = (error as Error).message ?? '发送失败，请稍后再试';
  } finally {
    // 最终状态重置
    loading.value = false;
    nextTick(scrollToBottom);
  }
}

async function handleRegenerate(message: ChatMessage) {
  if (!adapter.value.regenerate || loading.value || messagesLoading.value)
    return;
  const conversation = requireActiveConversation();
  const messages = ensureMessages(conversation.id);
  const index = messages.findIndex(item => item.id === message.id);
  if (index === -1) return;
  const targetMessage = messages[index];
  if (!targetMessage) return;

  loading.value = true;
  errorMessage.value = undefined;

  const applyStreamUpdate = (incoming: ChatMessage, meta: AiChatStreamMeta) => {
    const normalized = normalizeAssistantMessage(incoming);
    // 确保响应式更新：替换整个对象而不是使用 Object.assign
    const index = messages.findIndex(msg => msg.id === targetMessage.id);
    if (index !== -1) {
      messages[index] = { ...targetMessage, ...normalized };
    }
    updateConversationMeta(conversation, messages[index].content ?? '');
    void nextTick(scrollToBottom);
  };

  try {
    const regeneratedRaw = await adapter.value.regenerate({
      conversation,
      message,
      model: modelValue.value,
      history: [...messages],
      onMessage: applyStreamUpdate,
    });

    // 如果 adapter 没有使用流式处理，手动处理返回的消息
    if (!targetMessage.content) {
      const regenerated = normalizeAssistantMessage(regeneratedRaw);
      const index = messages.findIndex(msg => msg.id === targetMessage.id);
      if (index !== -1) {
        messages[index] = { ...targetMessage, ...regenerated };
      }
      updateConversationMeta(conversation, messages[index].content ?? '');
    }
  } catch (error) {
    errorMessage.value = (error as Error).message ?? '重新生成失败，请稍后再试';
  } finally {
    loading.value = false;
    nextTick(scrollToBottom);
  }
}

async function handleClear() {
  if (loading.value || messagesLoading.value) return;
  const conversation = requireActiveConversation();
  const messages = ensureMessages(conversation.id);
  messages.splice(0, messages.length);
  updateConversationMeta(conversation, '');
  emit('clear', conversation);
  if (adapter.value.clearConversation) {
    try {
      await adapter.value.clearConversation(conversation);
    } catch (error) {
      errorMessage.value = (error as Error).message ?? '清空对话失败';
    }
  }
}

function createConversation() {
  const conversation = createConversationMeta(
    `新对话 ${conversations.value.length + 1}`
  );
  conversations.value.unshift(conversation);
  activeConversationId.value = conversation.id;
  ensureMessages(conversation.id);
  loadedConversations.add(conversation.id);
  emit('conversation-create', conversation);
  ElMessage.success('已创建新对话');
}

function handleConversationChange(item: ConversationItem<AiConversation>) {
  const match = conversations.value.find(
    conversation => conversation.id === item.id
  );
  if (match) {
    activeConversationId.value = match.id;
    ensureMessages(match.id);
    void loadMessagesForConversation(match.id);
    emit('conversation-change', match);
  }
}

function scrollToBottom() {
  const container = messagesContainer.value;
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

function delay(duration: number) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

async function streamMockResponse(
  text: string,
  base: ChatMessage,
  onMessage?: (message: ChatMessage, meta: AiChatStreamMeta) => void
): Promise<ChatMessage> {
  onMessage?.({ ...base }, { phase: 'start' });
  let acc = '';
  for (const char of Array.from(text)) {
    await delay(60);
    acc += char;
    onMessage?.({ ...base, content: acc }, { phase: 'update' });
  }
  const result = { ...base, content: acc };
  onMessage?.(result, { phase: 'complete' });
  return result;
}

/**
 * 创建内置的默认适配器
 *
 * 这个适配器用于在没有提供外部适配器时提供基础功能。
 * 主要用于演示和测试，它模拟了流式响应的效果。
 *
 * 实现要点：
 * 1. 延迟模拟网络请求时间
 * 2. 使用流式响应模式（如果提供了 onMessage 回调）
 * 3. 提供基础的对话功能
 *
 * @returns AiChatAdapter 默认适配器实例
 */
function createFallbackAdapter(): AiChatAdapter {
  return {
    /**
     * 发送消息并返回助手回复
     *
     * @param payload 消息发送参数
     * @param payload.conversation 会话信息
     * @param payload.prompt 用户输入的提示词
     * @param payload.model 使用的模型名称
     * @param payload.history 历史消息数组
     * @param payload.onMessage 可选的流式更新回调
     * @returns Promise<ChatMessage> 助手回复消息
     */
    async sendMessage({ prompt, onMessage }) {
      // 模拟网络延迟
      await delay(160);
      const finalText = `模拟回复：${prompt}`;

      // 创建基础消息对象（初始内容为空）
      const base = createMessage({
        role: 'assistant',
        content: '',
      });

      if (onMessage) {
        // 启动流式响应但不等待完成
        // 关键：适配器应该立即返回，让流式更新在后台进行
        streamMockResponse(finalText, base, onMessage).catch(error => {
          console.error('Stream error:', error);
        });
        // 立即返回基础消息对象，实际内容通过流式更新
        return base;
      }

      // 如果没有流式处理器，直接返回完整响应（向后兼容）
      return createMessage({
        role: 'assistant',
        content: finalText,
      });
    },

    /**
     * 重新生成指定消息的回复
     *
     * @param payload 重新生成参数
     * @param payload.conversation 会话信息
     * @param payload.message 要重新生成的消息
     * @param payload.model 使用的模型名称
     * @param payload.history 历史消息数组
     * @param payload.onMessage 可选的流式更新回调
     * @returns Promise<ChatMessage> 重新生成的回复消息
     */
    async regenerate({ message, onMessage }) {
      // 模拟网络延迟
      await delay(160);
      const finalText = `重新生成结果：${message.content}`;

      // 创建基础消息对象，保持原消息ID
      const base = createMessage({
        role: 'assistant',
        content: '',
      });
      base.id = message.id ?? base.id;

      if (onMessage) {
        // 启动流式响应但不等待完成
        streamMockResponse(finalText, base, onMessage).catch(error => {
          console.error('Stream error:', error);
        });
        // 立即返回基础消息对象，实际内容通过流式更新
        return base;
      }

      // 如果没有流式处理器，直接返回完整响应（向后兼容）
      return createMessage({
        role: 'assistant',
        content: finalText,
      });
    },
  };
}
</script>

<style scoped>
.ai-chat-panel {
  position: relative;
  display: flex;
  height: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--el-bg-color);
  box-sizing: border-box;
}

.sidebar {
  width: 280px;
  border-right: 1px solid var(--el-border-color-light);
  background-color: rgba(255, 255, 255, 0.96);
  display: flex;
  flex-direction: column;
}

.sidebar-loading {
  padding: 16px;
}

.conversation-list {
  flex: 1;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 68px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color-light);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.chat-header {
  height: 68px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.model-select {
  width: auto;
}

.chat-main {
  flex: 1 1 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.messages-container {
  flex: 1 1 auto;
  min-height: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.96);
}

.messages-skeleton {
  padding: 12px 0;
}

.chat-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--el-border-color-light);
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.98);
  box-sizing: border-box;
}

.sender {
  width: 100%;
}

.bubble-text {
  margin: 0;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}

.bubble-markdown :deep(p) {
  margin: 0 0 0.75em;
}

.chat-error {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 380px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-text {
  flex: 1;
}

.typing-dots {
  display: inline-flex;
  gap: 2px;
  align-items: baseline;
}

.typing-dots span {
  animation: typing 1.4s infinite;
  font-size: 16px;
  line-height: 1;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
