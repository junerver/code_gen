<template>
  <div class="requirements-conversation-page">
    <div class="page-header">
      <h1>需求对话</h1>
      <p class="page-subtitle">通过智能对话使用自然语言澄清您的需求</p>
    </div>

    <div class="page-content">
      <RequirementsConversation
        @completed="handleConversationCompleted"
        @error="handleConversationError"
      />

      <!-- 需求文档展示区域 -->
      <div v-if="completedDocument" class="document-section">
        <el-divider />
        <div class="document-header">
          <h3>生成的需求文档</h3>
          <el-button
            v-if="canProceedToModeling"
            type="primary"
            @click="proceedToModeling"
          >
            进入业务建模
          </el-button>
        </div>
        <el-tabs v-model="activeTab" class="document-tabs">
          <el-tab-pane label="概览" name="overview">
            <div class="overview-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="置信度评分">
                  <el-progress
                    :percentage="Math.round(completedDocument.confidence * 100)"
                    :status="getConfidenceStatus(completedDocument.confidence)"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="领域">{{
                  completedDocument.domain || '通用'
                }}</el-descriptions-item>
                <el-descriptions-item label="复杂度">{{
                  completedDocument.complexity || '中等'
                }}</el-descriptions-item>
                <el-descriptions-item label="预估工作量">{{
                  completedDocument.estimatedEffort || '待确定'
                }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <el-tab-pane label="实体" name="entities">
            <div class="entities-section">
              <el-collapse v-model="expandedEntities">
                <el-collapse-item
                  v-for="entity in completedDocument.entities"
                  :key="entity.id"
                  :title="entity.name"
                  :name="entity.id"
                >
                  <el-descriptions :column="1" size="small">
                    <el-descriptions-item label="类型" :span="1">{{
                      entity.type
                    }}</el-descriptions-item>
                    <el-descriptions-item label="复杂度" :span="1">{{
                      entity.complexity
                    }}</el-descriptions-item>
                    <el-descriptions-item label="描述" :span="2">{{
                      entity.description
                    }}</el-descriptions-item>
                    <el-descriptions-item label="属性" :span="2">
                      <el-table
                        :data="entity.attributes"
                        size="small"
                        style="width: 100%"
                      >
                        <el-table-column prop="name" label="名称" width="120" />
                        <el-table-column prop="type" label="类型" width="80" />
                        <el-table-column
                          prop="required"
                          label="必填"
                          width="80"
                        >
                          <template #default="{ row }">
                            <el-tag
                              :type="row.required ? 'success' : 'info'"
                              size="small"
                            >
                              {{ row.required ? '是' : '否' }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="description" label="描述" />
                      </el-table>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>

          <el-tab-pane label="关系" name="relationships">
            <div class="relationships-section">
              <el-table
                :data="completedDocument.relationships"
                style="width: 100%"
              >
                <el-table-column prop="from" label="从" width="120" />
                <el-table-column prop="to" label="到" width="120" />
                <el-table-column prop="type" label="类型" width="120" />
                <el-table-column prop="description" label="描述" />
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="业务规则" name="rules">
            <div class="rules-section">
              <el-table
                :data="completedDocument.businessRules"
                style="width: 100%"
              >
                <el-table-column prop="entity" label="实体" width="120" />
                <el-table-column prop="rule" label="规则" />
                <el-table-column prop="priority" label="优先级" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getPriorityType(row.priority)" size="small">
                      {{ row.priority }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="category" label="类别" width="120" />
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();

const completedDocument = ref<any>(null);
const activeTab = ref('overview');
const expandedEntities = ref<string[]>([]);
const canProceedToModeling = computed(() => {
  return (
    completedDocument.value &&
    completedDocument.value.confidence >= 0.7 &&
    completedDocument.value.entities?.length > 0
  );
});

const handleConversationCompleted = (event: any) => {
  completedDocument.value = event.requirementDocument;
  ElMessage.success('Requirements clarification completed!');

  // 展开所有实体
  if (completedDocument.value?.entities) {
    expandedEntities.value = completedDocument.value.entities.map(
      (e: any) => e.id
    );
  }
};

const handleConversationError = (error: string) => {
  ElMessage.error(`Conversation error: ${error}`);
};

const getConfidenceStatus = (confidence: number) => {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.6) return 'warning';
  return 'exception';
};

const getPriorityType = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
};

const proceedToModeling = () => {
  if (!completedDocument.value) return;

  // 导航到业务建模页面，传入需求文档
  router.push({
    path: '/modeling/game',
    query: {
      requirements: JSON.stringify(completedDocument.value),
      source: 'conversation',
    },
  });
};
</script>

<style scoped>
.requirements-conversation-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.page-subtitle {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.page-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.document-section {
  padding: 24px;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.document-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.document-tabs {
  margin-top: 16px;
}

.overview-section,
.entities-section,
.relationships-section,
.rules-section {
  padding: 16px 0;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .requirements-conversation-page {
    padding: 16px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .document-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .summary-stats {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
