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
        @change ="handleConversationSelect"
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
              <ChatDotRound/>
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
                  <ChatDotRound/>
                </el-icon>
              </template>
            </el-empty>
          </div>

          <!-- 使用 BubbleList 组件显示消息列表 -->
          <BubbleList
            v-else
            ref="bubbleListRef"
            :list="formattedMessages"
            class="bubble-list"
          />
        </div>
      </el-main>

      <!-- 使用 Sender 输入组件 -->
      <el-footer class="chat-footer">
        <Sender
          v-model="inputMessage"
          :disabled="loading"
          :placeholder="'请输入您的问题或代码需求...'"
          class="message-sender"
          @submit="handleSendMessage"
        />
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
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed} from "vue";
import {ChatDotRound, Delete, Plus} from "@element-plus/icons-vue";
import {ElMessage, ElMessageBox} from "element-plus";
import {BubbleList, Conversations, Sender} from "vue-element-plus-x";
import {useChat} from "~/composables/useChat";
import type {TypewriterProps} from "vue-element-plus-x/types/Typewriter";
import type {BubbleProps} from "vue-element-plus-x/types/Bubble";
import type {ConversationItem, ConversationMenuCommand} from "vue-element-plus-x/types/Conversations";
import type {BubbleListInstance} from "vue-element-plus-x/types/BubbleList";

// 会话管理相关数据
interface Conversation {
  id: string;
  label: string;
  group?: string;
  disabled?: boolean;
  lastMessage?: string;
  timestamp: Date;
}

// 使用聊天功能
const {messages, loading, error, sendMessage, clearMessages} = useChat();

// 响应式数据
const inputMessage = ref("");
const messagesContainer = ref<HTMLElement>();
const conversations = ref<ConversationItem<Conversation>[]>([]);
const activeConversation = ref<string>("");
const bubbleListRef = ref();

// 头像配置
const userAvatar = "https://avatars.githubusercontent.com/u/76239030?v=4";
const assistantAvatar =
  "https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png";

// 格式化消息数据，将存储在内存中的数据转换成 BubbleList 组件需要的数据结构
const formattedMessages = computed<BubbleProps[]>(() => {
  return messages.value.map((message) => {
    const isUser = message.role === "user";
    const shape = "corner";
    const variant = !isUser ? "filled" : "outlined";
    const placement = isUser ? "end" : "start";
    const typing: TypewriterProps["typing"] = isUser
      ? false
      : {step: 5, interval: 35};
    return {
      ...message,
      placement,
      avatar: isUser ? userAvatar : assistantAvatar,
      avatarSize: "32px",
      shape,
      variant,
      typing,
      maxWidth: isUser ? "500px" : "900px",
    };
  });
});

/**
 * 处理发送消息
 */
const handleSendMessage = async (message?: string): Promise<void> => {
  const messageContent = message || inputMessage.value.trim();
  if (!messageContent || loading.value) return;

  inputMessage.value = "";
  // 发送消息并获取新消息ID
  await sendMessage(messageContent);
  await scrollToBottom();
};

/**
 * 处理会话选择
 * @param item 选中的会话项
 */
const handleConversationSelect = (item: ConversationItem<Conversation>): void => {
  activeConversation.value = item.id;
  // 这里可以加载对应会话的消息
  ElMessage.info(`切换到会话: ${item.label}`);
};

/**
 * 处理创建新会话
 */
const handleConversationCreate = (): void => {
  const newConversation: ConversationItem<Conversation> = {
    id: `conv_${Date.now()}`,
    label: `新对话 ${conversations.value.length + 1}`,
    group: 'recent',
    timestamp: new Date(),
  };
  conversations.value.unshift(newConversation);
  activeConversation.value = newConversation.id;
  clearMessages();
  ElMessage.success("已创建新对话");
};

// 内置菜单点击方法
function handleMenuCommand(
  command: ConversationMenuCommand,
  item: ConversationItem<Conversation>
) {
  console.log('内置菜单点击事件：', command, item);
  // 直接修改 item 是否生效
  if (command === 'delete') {
    const index = conversations.value.findIndex(
      itemSlef => itemSlef.id === item.id
    );

    if (index !== -1) {
      conversations.value.splice(index, 1);
      console.log('删除成功');
      ElMessage.success('删除成功');
    }
  }
  if (command === 'rename') {
    item.label = '已修改';
    console.log('重命名成功');
    ElMessage.success('重命名成功');
  }
}

/**
 * 处理清空聊天
 */
const handleClearChat = (): void => {
  ElMessageBox.confirm(
    "确定要清空所有对话记录吗？此操作不可恢复。",
    "确认清空",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      clearMessages();
      ElMessage.success("对话记录已清空");
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
  // 创建默认会话
  handleConversationCreate();
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
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
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

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

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

.chat-footer {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e4e7ed;
  padding: 24px;
  height: auto;
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
  font-family: "Fira Code", "Consolas", monospace;
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
