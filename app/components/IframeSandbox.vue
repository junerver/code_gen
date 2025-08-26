<template>
  <div class="iframe-container">
    <iframe
      ref="iframe"
      :src="codeRendererServer"
      frameborder="0"
      width="100%"
      height="100%"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  codeRendererServer?: string;
  /** 要渲染的代码文件集合，键为文件路径，值为文件内容 */
  codes: {
    [key: string]: string;
  };
  // 入口文件名
  entryFile: string;
}

const {
  codeRendererServer = 'http://localhost:3004',
  codes,
  entryFile,
} = defineProps<Props>();
const iframeRef = useTemplateRef<HTMLIFrameElement>('iframe');

/**
 * 向iframe发送消息
 * 使用JSON序列化确保数据可以被postMessage正确传递
 */
const sendMessage = () => {
  if (!iframeRef.value) return;

  try {
    iframeRef.value.contentWindow?.postMessage(
      {
        type: 'artifacts',
        data: {
          files: JSON.parse(JSON.stringify(codes)),
          entryFile: String(entryFile),
        },
      },
      codeRendererServer,
    );
  } catch (error) {
    console.error('发送消息失败:', error);
  }
};
const handleMessage = (event: MessageEvent) => {
  // 确保消息来源是当前iframe
  if (event.source !== iframeRef.value?.contentWindow) {
    return;
  }

  // iframe加载完成，发送代码数据
  if (event.data === 'IFRAME_LOADED') {
    console.log('IFRAME_LOADED');
    sendMessage();
    // 通知加载成功
  }
  // 处理渲染错误
  if (event.data.type === 'artifacts-error') {
    console.error(event.data.errorMessage);
    //todo: 错误处理
  }
  // 处理渲染成功
  if (event.data.type === 'artifacts-success') {
    // todo: 成功处理
  }
};
onMounted(() => {
  window.addEventListener('message', handleMessage);
});
onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<style scoped>
/**
 * iframe容器样式
 * 确保iframe能够正确继承父容器的高度
 */
.iframe-container {
  width: 100%;
  height: 100%;
  min-height: 500px; /* 设置最小高度，避免高度塌陷 */
  display: flex;
  flex-direction: column;
}

.iframe-container iframe {
  flex: 1;
  border: none;
  background: #fff;
}
</style>
