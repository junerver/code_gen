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
              <XMarkdown
                v-if="item.role === 'assistant'"
                :markdown="String(item.content ?? '')"
                class="bubble-markdown"
              />
              <p v-else class="bubble-text">{{ item.content }}</p>
            </template>
            <template #footer="{ item }">
              <el-tooltip
                v-if="canRegenerate && item.role === 'assistant'"
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
  return ensureMessages(id);
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
  };
}

function updateConversationMeta(conversation: AiConversation, text: string) {
  conversation.lastMessage = text;
  conversation.updatedAt = new Date().toISOString();
}

async function handleSend(message?: string) {
  if (loading.value || messagesLoading.value) return;
  const content = (message ?? inputValue.value).trim();
  if (!content) return;

  const conversation = requireActiveConversation();
  const targetMessages = ensureMessages(conversation.id);
  const requestMessage = createMessage({ role: 'user', content });
  targetMessages.push(requestMessage);
  updateConversationMeta(conversation, content);

  inputValue.value = '';
  loading.value = true;
  errorMessage.value = undefined;

  try {
    const responseRaw = await adapter.value.sendMessage({
      conversation,
      prompt: content,
      model: modelValue.value,
      history: [...targetMessages],
    });
    const response = normalizeAssistantMessage(responseRaw);
    targetMessages.push(response);
    updateConversationMeta(conversation, response.content ?? '');
    emit('message-send', {
      conversation,
      request: requestMessage,
      response,
    });
  } catch (error) {
    errorMessage.value = (error as Error).message ?? '发送失败，请稍后再试';
  } finally {
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

  loading.value = true;
  errorMessage.value = undefined;

  try {
    const regeneratedRaw = await adapter.value.regenerate({
      conversation,
      message,
      model: modelValue.value,
      history: [...messages],
    });
    const regenerated = normalizeAssistantMessage(regeneratedRaw);
    messages.splice(index, 1, regenerated);
    updateConversationMeta(conversation, regenerated.content ?? '');
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

function createFallbackAdapter(): AiChatAdapter {
  return {
    async sendMessage({ prompt }) {
      await delay(400);
      return createMessage({
        role: 'assistant',
        content: `模拟回复：${prompt}`,
      });
    },
    async regenerate({ message }) {
      await delay(400);
      return createMessage({
        role: 'assistant',
        content: `重新生成结果：${message.content}`,
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
</style>
