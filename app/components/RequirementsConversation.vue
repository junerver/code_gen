<template>
  <div class="requirements-conversation">
    <div class="conversation-header">
      <h3>需求澄清助手</h3>
      <div class="conversation-status">
        <el-tag :type="getStatusType(state.status)" size="small">
          {{ getStatusLabel(state.status) }}
        </el-tag>
        <span v-if="state.confidence > 0" class="confidence">
          置信度: {{ Math.round(state.confidence * 100) }}%
        </span>
      </div>
    </div>

    <div ref="messagesContainer" class="messages-container">
      <div
        v-for="message in state.messages"
        :key="message.id"
        :class="['message', message.role]"
      >
        <div class="message-content">
          <div class="message-header">
            <span class="role">{{ message.role }}</span>
            <span class="timestamp">{{
              formatTimestamp(message.timestamp)
            }}</span>
          </div>
          <div class="message-body">
            <pre v-if="message.type === 'clarification'">{{
              message.content
            }}</pre>
            <div v-else>{{ message.content }}</div>
          </div>
        </div>
      </div>

      <div v-if="state.isLoading" class="typing-indicator">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在分析您的需求...
      </div>
    </div>

    <div class="input-area">
      <div v-if="state.error" class="error-message">
        <el-alert :title="state.error" type="error" :closable="false" />
      </div>

      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="描述您的需求或回答澄清问题..."
        :disabled="state.isLoading"
        @keyup.enter.ctrl="sendMessage"
      />

      <div class="input-actions">
        <el-button
          type="primary"
          :loading="state.isLoading"
          :disabled="!inputMessage.trim()"
          @click="sendMessage"
        >
          发送消息
        </el-button>
        <el-button :disabled="state.isLoading" @click="resetConversation">
          新对话
        </el-button>
      </div>
    </div>

    <!-- 需求摘要 -->
    <div v-if="getRequirementSummary" class="requirement-summary">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>需求摘要</span>
            <el-tag v-if="canStartModeling" type="success" size="small">
              可进行建模
            </el-tag>
          </div>
        </template>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{{ getRequirementSummary.entities }}</div>
            <div class="stat-label">实体</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ getRequirementSummary.relationships }}
            </div>
            <div class="stat-label">关系</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ getRequirementSummary.businessRules }}
            </div>
            <div class="stat-label">业务规则</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ Math.round(getRequirementSummary.confidence * 100) }}%
            </div>
            <div class="stat-label">置信度</div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useRequirementsConversation } from '~/composables/useRequirementsConversation';
import { ElMessage } from 'element-plus';

const props = defineProps({
  model: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(['completed', 'error']);

const {
  state,
  sendMessage: sendMessageApi,
  startNewConversation,
  getRequirementSummary,
  canStartModeling,
} = useRequirementsConversation();

const inputMessage = ref('');
const messagesContainer = ref<HTMLElement>();

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  const message = inputMessage.value;
  inputMessage.value = '';

  const result = await sendMessageApi(message, { model: props.model });

  if (!result.success) {
    ElMessage.error(result.error || '发送消息失败');
    emit('error', result.error);
    return;
  }

  // 对话完成时触发事件
  if (result.status === 'completed') {
    emit('completed', {
      requirementDocument: result.requirementDocument,
      confidence: result.confidence || 0,
    });
  }

  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
};

const resetConversation = async () => {
  await startNewConversation();
  inputMessage.value = '';
  ElMessage.success('对话已成功重置');
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'confirmed':
      return 'warning';
    case 'clarifying':
    case 'parsing':
      return 'info';
    default:
      return 'info';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'new':
      return '新对话';
    case 'clarifying':
      return '正在澄清需求';
    case 'confirmed':
      return '需求已确认';
    case 'parsing':
      return '正在处理需求';
    case 'completed':
      return '需求已完成';
    default:
      return status;
  }
};

watch(
  () => state.messages,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  },
  { deep: true }
);

// 如果有需求摘要，滚动到摘要
watch(getRequirementSummary, newSummary => {
  if (newSummary) {
    nextTick(() => {
      scrollToBottom();
    });
  }
});
</script>

<style scoped>
.requirements-conversation {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
  max-height: 80vh;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.conversation-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.conversation-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confidence {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.user .message-content {
  background: var(--el-color-primary-light-9);
  border-top-right-radius: 0;
}

.message.assistant .message-content {
  background: white;
  border-top-left-radius: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.role {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.timestamp {
  color: var(--el-text-color-secondary);
}

.message-body {
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.message-body pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  font-style: italic;
}

.input-area {
  padding: 16px;
  border-top: 1px solid var(--el-border-color);
  background: white;
}

.error-message {
  margin-bottom: 16px;
}

.input-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.requirement-summary {
  padding: 0 16px 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat-item {
  padding: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* Scrollbar styles */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-placeholder);
}
</style>
