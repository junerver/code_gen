<template>
  <el-dialog
    v-model="dialogVisible"
    title="组件预览iframe"
    width="90%"
    style="height: 80vh; overflow: hidden"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div style="height: 70vh; overflow: hidden">
      <IframeSandbox :codes="codes" entry-file="BizComponent.vue" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
const codes = ref({});
const dialogVisible = ref(false);

const openDialog = (code: string) => {
  codes.value = {
    "BizComponent.vue": genPreviewCode(code),
  };
  dialogVisible.value = true;
};

defineExpose({ openDialog });
</script>

<style scoped></style>
