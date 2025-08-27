<template>
  <el-dialog
    v-model="dialogVisible"
    title="组件预览"
    width="95%"
    class="code-renderer-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
  >
    <div class="iframe-wrapper">
      <IframeSandbox :codes="codes" entry-file="BizComponent.vue" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
const codes = ref({});
const dialogVisible = ref(false);

const openDialog = (code: string) => {
  codes.value = {
    'BizComponent.vue': genPreviewCode(code),
  };
  dialogVisible.value = true;
};

defineExpose({ openDialog });
</script>

<style scoped>
/**
 * 代码渲染器对话框样式
 * 优化iframe显示效果
 */
:deep(.code-renderer-dialog) {
  height: 85vh;
  max-height: 900px;
  display: flex;
  flex-direction: column;
}

:deep(.code-renderer-dialog .el-dialog__body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.iframe-wrapper {
  height: 75vh;
  min-height: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}
</style>
