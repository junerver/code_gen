<!--
@Description 需求解析示例页面
@Author Qoder AI
@Date 2025-09-22
-->

<template>
  <div class="requirement-analysis-page">
    <div class="page-header">
      <h1>需求解析系统</h1>
      <p class="page-description">
        通过多轮对话收集需求，自动生成需求文档和业务模型
      </p>
    </div>

    <div class="content-container">
      <!-- 左侧：对话区域 -->
      <div class="dialog-section">
        <div class="dialog-header">
          <h2>需求对话</h2>
          <div class="dialog-status">
            <span class="phase-indicator" :class="currentPhase">
              {{ phaseLabels[currentPhase] }}
            </span>
            <div class="completeness-bar">
              <div
                class="progress"
                :style="{ width: `${completeness * 100}%` }"
              />
              <span class="percentage"
                >{{ Math.round(completeness * 100) }}%</span
              >
            </div>
          </div>
        </div>

        <!-- 域设置 -->
        <div v-if="currentPhase === 'collecting'" class="domain-selector">
          <label>业务领域：</label>
          <select v-model="selectedDomain" @change="handleDomainChange">
            <option value="">请选择...</option>
            <option value="电商">电商</option>
            <option value="金融">金融</option>
            <option value="教育">教育</option>
            <option value="医疗">医疗</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <!-- 消息列表 -->
        <div ref="messagesContainer" class="messages-container">
          <div v-if="messages.length === 0" class="welcome-message">
            <h3>👋 欢迎使用需求解析系统</h3>
            <p>请详细描述您的需求，我会通过对话帮您完善需求文档。</p>
            <div class="quick-starters">
              <button
                v-for="starter in quickStarters"
                :key="starter"
                class="starter-btn"
                @click="sendMessage(starter)"
              >
                {{ starter }}
              </button>
            </div>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-content">
              <div
                class="message-text"
                v-html="formatMessage(message.content)"
              />
              <div class="message-time">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 建议问题 -->
        <div v-if="nextQuestions.length > 0" class="suggestions-section">
          <h4>建议回答的问题：</h4>
          <div class="suggestion-questions">
            <button
              v-for="question in nextQuestions"
              :key="question"
              class="question-btn"
              @click="sendMessage(question)"
            >
              {{ question }}
            </button>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-section">
          <div class="input-container">
            <textarea
              v-model="inputMessage"
              placeholder="请描述您的需求..."
              :disabled="loading || isDialogCompleted"
              rows="3"
              @keydown.ctrl.enter="handleSend"
            />
            <button
              :disabled="!inputMessage.trim() || loading"
              class="send-btn"
              @click="handleSend"
            >
              {{ loading ? '处理中...' : '发送' }}
            </button>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="dialog-actions">
          <button class="reset-btn" @click="resetDialog">重新开始</button>
          <button class="export-btn" @click="exportDialog">导出对话</button>
          <button
            v-if="isDialogCompleted && requirementDocument"
            :disabled="modelingLoading"
            class="model-btn"
            @click="generateModel"
          >
            {{ modelingLoading ? '生成中...' : '生成业务模型' }}
          </button>
        </div>
      </div>

      <!-- 右侧：结果展示 -->
      <div class="results-section">
        <!-- 需求文档 -->
        <div v-if="requirementDocument" class="document-panel">
          <h3>📄 需求文档</h3>
          <div class="document-content">
            <div class="document-item">
              <strong>标题：</strong> {{ requirementDocument.title }}
            </div>
            <div class="document-item">
              <strong>领域：</strong> {{ requirementDocument.domain }}
            </div>
            <div class="document-item">
              <strong>功能需求：</strong>
              {{ requirementDocument.functionalRequirements.length }} 项
            </div>
            <div class="document-item">
              <strong>用户场景：</strong>
              {{ requirementDocument.userScenarios.length }} 个
            </div>
            <div class="document-item">
              <strong>完整性：</strong>
              {{ Math.round(requirementDocument.metadata.completeness * 100) }}%
            </div>
          </div>
          <button class="view-details-btn" @click="viewDocumentDetails">
            查看详情
          </button>
        </div>

        <!-- 业务模型 -->
        <div v-if="businessModel" class="model-panel">
          <h3>🏗️ 业务模型</h3>
          <div class="model-stats">
            <div class="stat-item">
              <span class="stat-label">实体：</span>
              <span class="stat-value">{{
                businessModel.entities.length
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">关系：</span>
              <span class="stat-value">{{
                businessModel.relationships.length
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">业务规则：</span>
              <span class="stat-value">{{
                businessModel.businessRules.length
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">置信度：</span>
              <span class="stat-value confidence" :class="confidenceLevel">
                {{ Math.round(businessModel.confidence * 100) }}%
              </span>
            </div>
          </div>

          <div class="model-validation">
            <div
              class="validation-status"
              :class="{ valid: isModelValid, invalid: !isModelValid }"
            >
              {{ isModelValid ? '✅ 验证通过' : '❌ 存在问题' }}
            </div>
            <div v-if="validationErrors.length > 0" class="validation-errors">
              <div
                v-for="error in validationErrors.slice(0, 3)"
                :key="error.field"
                class="error-item"
              >
                {{ error.message }}
              </div>
            </div>
          </div>

          <div class="model-actions">
            <button class="view-model-btn" @click="viewModelDetails">
              查看模型
            </button>
            <button class="export-model-btn" @click="exportModel">
              导出模型
            </button>
          </div>
        </div>

        <!-- 建议改进 -->
        <div v-if="suggestions.length > 0" class="suggestions-panel">
          <h3>💡 改进建议</h3>
          <ul class="suggestions-list">
            <li v-for="suggestion in suggestions.slice(0, 5)" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRequirementDialog } from '~/composables/useRequirementDialog';
import { useBusinessModeling } from '~/composables/useBusinessModeling';

// 对话相关
const {
  loading,
  error,
  messages,
  currentPhase,
  completeness,
  isDialogCompleted,
  requirementDocument,
  suggestions,
  nextQuestions,
  sendMessage: sendDialogMessage,
  resetDialog,
  setDomain,
  exportDialogData,
} = useRequirementDialog({
  domain: '',
  model: 'DeepSeek-Chat',
});

// 业务建模相关
const {
  loading: modelingLoading,
  error: modelingError,
  businessModel,
  validationErrors,
  confidence,
  isModelValid,
  confidenceLevel,
  generateBusinessModel,
  exportModel: exportBusinessModel,
} = useBusinessModeling({
  model: 'DeepSeek-Chat',
});

// 界面状态
const inputMessage = ref('');
const selectedDomain = ref('');
const messagesContainer = ref<HTMLElement>();

// 阶段标签
const phaseLabels = {
  collecting: '收集需求',
  clarifying: '澄清细节',
  finalizing: '确认需求',
  completed: '已完成',
};

// 快速开始模板
const quickStarters = [
  '我想开发一个在线商城系统',
  '需要一个学生管理系统',
  '想做一个任务管理应用',
  '需要一个客户关系管理系统',
];

// 处理发送消息
const handleSend = async () => {
  if (!inputMessage.value.trim() || loading.value) return;

  const message = inputMessage.value.trim();
  inputMessage.value = '';

  await sendDialogMessage(message);

  // 滚动到底部
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 处理领域变更
const handleDomainChange = () => {
  if (selectedDomain.value) {
    setDomain(selectedDomain.value);
  }
};

// 生成业务模型
const generateModel = async () => {
  if (!requirementDocument.value) return;

  await generateBusinessModel(requirementDocument.value, {
    targetComplexity: 'medium',
    validationLevel: 'basic',
  });
};

// 格式化消息
const formatMessage = (content: string) => {
  // 简单的markdown渲染
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

// 格式化时间
const formatTime = (timestamp?: Date) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString();
};

// 查看文档详情
const viewDocumentDetails = () => {
  if (requirementDocument.value) {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>需求文档详情</title></head>
          <body>
            <pre>${JSON.stringify(requirementDocument.value, null, 2)}</pre>
          </body>
        </html>
      `);
    }
  }
};

// 查看模型详情
const viewModelDetails = () => {
  if (businessModel.value) {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>业务模型详情</title></head>
          <body>
            <pre>${JSON.stringify(businessModel.value, null, 2)}</pre>
          </body>
        </html>
      `);
    }
  }
};

// 导出对话
const exportDialog = () => {
  const data = exportDialogData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `requirement-dialog-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 导出模型
const exportModel = () => {
  const modelData = exportBusinessModel('json');
  if (modelData) {
    const blob = new Blob([modelData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-model-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// 页面加载时的初始化
onMounted(() => {
  console.log('需求解析页面加载完成');
});
</script>

<style scoped>
.requirement-analysis-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.page-description {
  color: #7f8c8d;
  font-size: 16px;
}

.content-container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 30px;
  height: 800px;
}

/* 对话区域样式 */
.dialog-section {
  display: flex;
  flex-direction: column;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  overflow: hidden;
}

.dialog-header {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-status {
  display: flex;
  align-items: center;
  gap: 15px;
}

.phase-indicator {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.phase-indicator.collecting {
  background: #e3f2fd;
  color: #1976d2;
}
.phase-indicator.clarifying {
  background: #fff3e0;
  color: #f57c00;
}
.phase-indicator.finalizing {
  background: #f3e5f5;
  color: #7b1fa2;
}
.phase-indicator.completed {
  background: #e8f5e8;
  color: #388e3c;
}

.completeness-bar {
  position: relative;
  width: 100px;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #4caf50);
  transition: width 0.3s ease;
}

.percentage {
  position: absolute;
  top: -20px;
  right: 0;
  font-size: 12px;
  color: #666;
}

.domain-selector {
  padding: 15px 20px;
  background: #f0f7ff;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  align-items: center;
  gap: 10px;
}

.domain-selector select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
}

.quick-starters {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.starter-btn {
  padding: 8px 16px;
  border: 1px solid #1976d2;
  background: white;
  color: #1976d2;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.starter-btn:hover {
  background: #1976d2;
  color: white;
}

.message {
  margin-bottom: 20px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
}

.message.user .message-content {
  background: #1976d2;
  color: white;
}

.message.assistant .message-content {
  background: #f5f5f5;
  color: #333;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 5px;
}

.suggestions-section {
  padding: 15px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e1e8ed;
}

.suggestion-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.question-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.question-btn:hover {
  border-color: #1976d2;
  color: #1976d2;
}

.input-section {
  padding: 20px;
  border-top: 1px solid #e1e8ed;
}

.input-container {
  display: flex;
  gap: 10px;
}

.input-container textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
}

.send-btn {
  padding: 12px 20px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #1565c0;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #d32f2f;
  font-size: 14px;
  margin-top: 10px;
}

.dialog-actions {
  padding: 15px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e1e8ed;
  display: flex;
  gap: 10px;
}

.dialog-actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-btn {
  background: #4caf50 !important;
  color: white !important;
  border-color: #4caf50 !important;
}

/* 结果区域样式 */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.document-panel,
.model-panel,
.suggestions-panel {
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 20px;
  background: white;
}

.document-item,
.stat-item {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
}

.model-stats {
  margin-bottom: 15px;
}

.confidence.high {
  color: #4caf50;
}
.confidence.medium {
  color: #ff9800;
}
.confidence.low {
  color: #f44336;
}

.validation-status.valid {
  color: #4caf50;
}
.validation-status.invalid {
  color: #f44336;
}

.validation-errors {
  margin-top: 10px;
}

.error-item {
  background: #ffebee;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 5px;
}

.model-actions,
.view-details-btn,
.view-model-btn,
.export-model-btn {
  margin-top: 15px;
}

.suggestions-list {
  margin: 0;
  padding-left: 20px;
}

.suggestions-list li {
  margin-bottom: 8px;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .dialog-section {
    height: 600px;
  }
}
</style>
