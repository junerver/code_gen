<template>
  <div class="model-select">
    <el-popover
      v-model:visible="showPopover"
      placement="bottom-start"
      :width="400"
      trigger="click"
      popper-class="model-select-popover"
    >
      <template #reference>
        <el-button class="model-select-trigger" :icon="ArrowDown">
          {{ selectedModelDisplay || '选择模型' }}
        </el-button>
      </template>

      <div class="model-popover-content">
        <div class="model-header">
          <span class="model-title">选择AI模型</span>
        </div>

        <div class="model-list">
          <div
            v-for="model in AvailableModels"
            :key="model.name"
            class="model-item"
            :class="{ active: modelValue === model.name }"
            @click="selectModel(model.name)"
          >
            <div class="model-info">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-description">
                {{ displayDescription(model) }}
              </div>
            </div>
            <el-icon v-if="modelValue === model.name" class="check-icon">
              <Check />
            </el-icon>
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ArrowDown, Check } from '@element-plus/icons-vue';
import {
  type AvailableModelNames,
  AvailableModels,
  DEFAULT_MODEL,
} from '#shared/types/model';

/**
 * 双向绑定的模型名称
 */
const modelValue = defineModel<AvailableModelNames>({
  default: DEFAULT_MODEL,
});

/**
 * Popover显示状态
 */
const showPopover = ref(false);

/**
 * 计算选中模型的显示名称
 */
const selectedModelDisplay = computed(() => {
  if (!modelValue.value) return null;
  const model = AvailableModels.find(m => m.name === modelValue.value);
  return model?.name || modelValue.value;
});

/**
 * 选择模型
 * @param modelName 模型名称
 */
const selectModel = (modelName: AvailableModelNames) => {
  modelValue.value = modelName;
  showPopover.value = false; // 选择后自动关闭popover
};

const displayDescription = (modelConfig: (typeof AvailableModels)[number]) => {
  return `[${modelConfig.provider}]${modelConfig.description}`;
};
</script>

<style scoped>
.model-select {
  width: 100%;
}

.model-select-trigger {
  width: 100%;
  justify-content: space-between;
}

.model-popover-content {
  padding: 0;
}

.model-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color-page);
}

.model-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.model-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-item:hover {
  background-color: var(--el-color-primary-light-9);
}

.model-item.active {
  background-color: var(--el-color-primary-light-8);
}

.model-info {
  flex: 1;
}

.model-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.model-description {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.check-icon {
  color: var(--el-color-primary);
  font-size: 16px;
  margin-left: 8px;
}
</style>
