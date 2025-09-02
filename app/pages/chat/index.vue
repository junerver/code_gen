<template>
  <div class="chat-container">
    <!-- 左侧会话管理 -->
    <div class="chat-sidebar">
      <Conversations
        v-model:active="activeConversation"
        :items="conversations"
        class="conversations-panel"
        row-key="id"
        groupable
        tooltip-placement="right"
        :tooltip-offset="35"
        @change="handleConversationSelect"
        @menu-command="handleMenuCommand"
      >
        <template #header>
          <div class="conversations-header">
            <h3>对话历史</h3>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="handleConversationCreate"
            >
              新建对话
            </el-button>
          </div>
        </template>
      </Conversations>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-main-area">
      <!-- 聊天头部 -->
      <el-header class="chat-header">
        <div class="header-content">
          <h2 class="chat-title">
            <el-icon>
              <ChatDotRound />
            </el-icon>
            AI代码生成助手
          </h2>
          <div class="header-actions">
            <el-button
              type="danger"
              :icon="Delete"
              :disabled="messages.length === 0"
              size="small"
              @click="handleClearChat"
            >
              清空对话
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 聊天主体 -->
      <el-main class="chat-main">
        <div ref="messagesContainer" class="messages-container">
          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="empty-state">
            <el-empty description="开始您的第一次对话吧！">
              <template #image>
                <el-icon size="64" color="#409eff">
                  <ChatDotRound />
                </el-icon>
              </template>
            </el-empty>
          </div>

          <!-- 使用 BubbleList 组件显示消息列表 -->
          <BubbleList
            v-else
            ref="bubbleListRef"
            max-height="calc(100vh - 200px)"
            :list="formattedMessages"
            class="bubble-list"
          >
            <template #header="{ item }">
              <div v-if="item.role === 'assistant' && item.reasoningContent">
                <Thinking
                  auto-collapse
                  max-width="900px"
                  :content="item.reasoningContent"
                  :status="item.reasoningStatus"
                />
              </div>
            </template>
            <template #content="{ item }">
              <XMarkdown
                v-if="item.role === 'assistant'"
                :markdown="item.content"
                class="vp-raw"
              />
              <p v-else>{{ item.content }}</p>
            </template>
            <template #footer="{ item }">
              <div
                v-if="item.role === 'assistant' && !item.typing"
                class="footer-container"
              >
                <!-- 重新生成 -->
                <el-button
                  type="info"
                  :icon="Refresh"
                  size="small"
                  circle
                  @click="handleRegenerate(item)"
                />
                <!-- 提取组件源码 -->
                <el-button
                  color="#626aef"
                  :icon="DocumentCopy"
                  size="small"
                  circle
                  @click="handleExtractCode(item)"
                />
                <!-- 预览组件 -->
                <el-button
                  color="#67c23a"
                  :icon="View"
                  size="small"
                  circle
                  @click="handlePreview(item)"
                />
              </div>
            </template>
          </BubbleList>
        </div>
      </el-main>

      <!-- 使用 Sender 输入组件 -->
      <el-footer class="chat-footer">
        <Sender
          v-model="inputMessage"
          :disabled="loading"
          :placeholder="'请输入您的问题或代码需求...'"
          class="message-sender"
          variant="updown"
          clearable
          @submit="handleSendMessage"
        >
          <template #prefix>
            <ModelSelect v-model="selectedModel" />
          </template>
        </Sender>
      </el-footer>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      closable
      class="error-alert"
      @close="error = undefined"
    />
    <CodePreview ref="previewRef" />
  </div>
</template>

<script setup lang="ts">
import {
  ChatDotRound,
  Delete,
  DocumentCopy,
  Plus,
  Refresh,
  View,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onMounted, ref } from 'vue';
import {
  BubbleList,
  Conversations,
  Sender,
  Thinking,
  XMarkdown,
} from 'vue-element-plus-x';
import type {
  ConversationItem,
  ConversationMenuCommand,
} from 'vue-element-plus-x/types/Conversations';
import type CodePreview from '~/components/CodePreview.vue';
import { useChat } from '~/composables/useChat';
import type { ChatMessage } from '~/types/chat';
import type { Conversation } from '~/types/conversation';

const previewRef =
  useTemplateRef<InstanceType<typeof CodePreview>>('previewRef');

// 修改 title
useHead({
  title: 'AI代码生成助手',
});

// 使用聊天功能
const {
  messages,
  loading,
  error,
  selectedModel,
  sendMessage,
  clearMessages,
  regenerate,
  conversationStore,
} = useChat();

// 响应式数据
const inputMessage = ref('');
const messagesContainer = ref<HTMLElement>();
const bubbleListRef = ref();

// 从store获取会话相关数据
const conversations = computed<ConversationItem<Conversation>[]>(() => {
  return conversationStore.conversations.map(conv => ({
    // 直接展开 conv 对象,避免重复指定 id
    ...conv,
    label: conv.title,
    group: conv.group,
    disabled: conv.disabled,
    lastMessage: conv.lastMessage,
    timestamp: conv.updatedAt,
    ...conv,
  }));
});

const activeConversation = computed({
  get: () => conversationStore.activeConversationId,
  set: (value: string) => {
    if (value) {
      conversationStore.setActiveConversation(value);
    }
  },
});

// 头像配置
const userAvatar = 'https://avatars.githubusercontent.com/u/76239030?v=4';
const assistantAvatar =
  'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png';

// 格式化消息数据，将存储在内存中的数据转换成 BubbleList 组件需要的数据结构
const formattedMessages = computed<ChatMessage[]>(() => {
  return messages.value.map(message => {
    const isUser = message.role === 'user';
    const variant = !isUser ? 'filled' : 'outlined';
    const placement = isUser ? 'end' : 'start';
    return {
      ...message,
      placement,
      avatar: isUser ? userAvatar : assistantAvatar,
      avatarSize: '32px',
      variant,
      maxWidth: '900px',
    };
  });
});

/**
 * 处理发送消息
 */
const handleSendMessage = async (message?: string): Promise<void> => {
  const messageContent = message || inputMessage.value.trim();
  if (!messageContent || loading.value) return;

  inputMessage.value = '';
  // 发送消息，现在包含流式处理
  await sendMessage(messageContent);
  await scrollToBottom();
};

/**
 * 处理重新生成消息
 * @param item 要重新生成的消息项
 */
const handleRegenerate = async (item: ChatMessage): Promise<void> => {
  if (item.role !== 'assistant') return;
  // 提示重生成将替换当前消息
  ElMessageBox.confirm(
    '确认重新生成当前消息吗？这将替换当前消息，且无法撤销。',
    '确认重新生成',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      // 调用重新生成消息的 API
      await regenerate(item.id);
      await scrollToBottom();
    })
    .catch(() => {
      // 用户取消
    });

  await scrollToBottom();
};

/**
 * 处理组件源码提取
 */
const handleExtractCode = (item: ChatMessage): void => {
  if (item.role !== 'assistant') return;
  const sourceCode = genPreviewCode(extractCode(item.content));
  if (sourceCode) {
    // 复制到剪贴板
    navigator.clipboard
      .writeText(sourceCode)
      .then(() => {
        ElMessage.success('源码已复制到剪贴板');
      })
      .catch(() => {
        ElMessage.error('复制失败,请手动复制');
      });
  } else {
    ElMessage.warning('未提取到组件源码');
  }
};

/**
 * 处理代码预览
 */
const handlePreview = (item: ChatMessage): void => {
  if (item.role !== 'assistant') return;
  const sourceCode = extractCode(item.content);
  if (sourceCode) {
    previewRef.value?.openDialog(sourceCode);
  } else {
    ElMessage.warning('未提取到组件源码');
  }
};

/**
 * 处理会话选择
 * @param item 选中的会话项
 */
const handleConversationSelect = (
  item: ConversationItem<Conversation>
): void => {
  if (item.id === activeConversation.value) return;
  conversationStore.setActiveConversation(item.id);
  ElMessage.success(`已切换到: ${item.label}`);
  // 滚动到底部显示最新消息
  nextTick(() => {
    scrollToBottom();
  });
};

/**
 * 处理创建新会话
 */
const handleConversationCreate = (): void => {
  // 检查最新创建的会话是否有消息
  if (conversationStore.isLatestConversationEmpty()) {
    // 如果最新会话为空，直接切换到最新会话而不是创建新会话
    conversationStore.switchToLatestConversation();
    return;
  }

  conversationStore.createConversation({
    title: `新对话`,
    group: 'recent',
  });
  ElMessage.success('已创建新对话');
  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
};

/**
 * 内置菜单点击方法
 * @param command 菜单命令
 * @param item 会话项
 */
function handleMenuCommand(
  command: ConversationMenuCommand,
  item: ConversationItem<Conversation>
) {
  if (command === 'delete') {
    ElMessageBox.confirm(
      `确定要删除会话 "${item.label}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        conversationStore.deleteConversation(item.id);
        ElMessage.success('会话已删除');
      })
      .catch(() => {
        // 用户取消
      });
  }

  if (command === 'rename') {
    ElMessageBox.prompt('请输入新的会话名称', '重命名会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.label,
      inputValidator: (value: string) => {
        if (!value || !value.trim()) {
          return '会话名称不能为空';
        }
        return true;
      },
    })
      .then(({ value }) => {
        conversationStore.updateConversation(item.id, { title: value.trim() });
        ElMessage.success('重命名成功');
      })
      .catch(() => {
        // 用户取消
      });
  }
}

/**
 * 处理清空当前会话聊天记录
 */
const handleClearChat = (): void => {
  if (!conversationStore.activeConversation) {
    ElMessage.warning('没有活跃的会话');
    return;
  }

  ElMessageBox.confirm(
    `确定要清空会话 "${conversationStore.activeConversation.title}" 的所有对话记录吗？此操作不可恢复。`,
    '确认清空',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      clearMessages();
      ElMessage.success('对话记录已清空');
    })
    .catch(() => {
      // 用户取消
    });
};

/**
 * 滚动到底部
 */
const scrollToBottom = async (): Promise<void> => {
  bubbleListRef.value?.scrollToBottom();
};

// 组件挂载时初始化
onMounted(() => {
  // 如果没有会话，创建默认会话
  if (conversationStore.conversationCount === 0) {
    conversationStore.initializeDefaultConversation();
  }

  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
});
</script>

<style>
/* 全局样式重置，防止页面滚动条 */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#__nuxt {
  height: 100vh;
  overflow: hidden;
}
</style>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* 左侧会话管理面板 */
.chat-sidebar {
  width: 300px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.conversations-panel {
  flex: 1;
  overflow: hidden;
}

.conversations-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversations-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 右侧聊天区域 */
.chat-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 70px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.chat-main {
  flex: 1;
  padding: 24px;
  overflow: hidden;
  min-height: 0;
}

.messages-container {
  height: 100%;
  overflow: hidden;
  padding-right: 8px;
}

/* 移除messages-container的滚动条样式，让BubbleList自己处理滚动 */

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Element-Plus-X 组件样式 */
.bubble-list {
  height: 100%;
  animation: fadeInUp 0.3s ease-out;
}

.footer-container {
  :deep(.el-button + .el-button) {
    margin-left: 8px;
  }
}

.chat-footer {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e4e7ed;
  padding: 24px;
  height: 120px;
  flex-shrink: 0;
}

.message-sender {
  width: 100%;
}

.send-tip {
  color: #909399;
  font-size: 12px;
}

.error-alert {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

/* Element-Plus-X 组件自定义样式 */
:deep(.Bubble) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  border-radius: 12px;
}

:deep(.Bubble.sent) {
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: white;
}

:deep(.Bubble .bubble-content) {
  line-height: 1.6;
  word-break: break-word;
}

:deep(.Bubble .bubble-content pre) {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

:deep(.Bubble .bubble-content code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
}

:deep(.Conversations) {
  height: 100%;
}

:deep(.Sender) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

:deep(.Sender:focus-within) {
  background: rgba(255, 255, 255, 0.95);
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.ex-typewriter) {
  font-family: inherit;
  line-height: 1.6;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .chat-sidebar {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .chat-header {
    padding: 0 16px;
    height: 60px;
  }

  .chat-title {
    font-size: 18px;
  }

  .chat-main {
    padding: 16px;
  }

  .chat-footer {
    padding: 16px;
  }

  .conversations-header {
    padding: 16px;
  }
}
</style>
