# AiChatPanel 组件

通用的 AI 会话面板，封装了会话列表、消息气泡、输入区、模型选择等 UI，支持通过适配器与业务接口对接。

## 快速开始

```vue
<template>
  <AiChatPanel
    v-model="model"
    :adapter="adapter"
    title="AI 助手"
    placeholder="输入问题..."
    @message-send="handleMessageSend"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { AiChatAdapter } from '~/components/ai-chat';
import { AiChatPanel } from '~/components/ai-chat';
import { DEFAULT_MODEL } from '#shared/types/model';

const model = ref(DEFAULT_MODEL);

const adapter: AiChatAdapter = {
  async loadConversations() {
    // return await api.getConversations();
    return [];
  },
  async loadMessages(conversationId) {
    // return await api.getMessages(conversationId);
    return [];
  },
  async sendMessage({ conversation, prompt }) {
    // const result = await api.sendMessage(conversation.id, prompt);
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Echo: ${prompt}`,
      timestamp: new Date(),
      placement: 'start',
    };
  },
};

function handleMessageSend() {
  // 可选：埋点、通知
}
</script>
```

## Props

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 面板标题 |
| `placeholder` | `string` | 输入框提示文案 |
| `initialConversations` | `AiConversation[]` | 初始会话列表（未启用接口时可用于本地预置） |
| `initialMessages` | `Record<string, ChatMessage[]>` | 初始消息映射 |
| `autoLoadConversations` | `boolean` | 是否在挂载时自动调用 `adapter.loadConversations`，默认 `true` |
| `avatars` | `{ user?: string; assistant?: string; }` | 气泡头像配置 |
| `adapter` | `AiChatAdapter` | 接口适配器，详见下文 |

## 事件

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `(value: AvailableModelNames)` | 当前选择的模型 |
| `conversation-create` | `(conversation: AiConversation)` | 创建新会话后触发 |
| `conversation-change` | `(conversation: AiConversation)` | 切换会话时触发 |
| `message-send` | `({ conversation, request, response })` | 完成一次发送后触发 |
| `clear` | `(conversation: AiConversation)` | 清空会话时触发 |

## Adapter 说明

`AiChatAdapter` 统一了与后端交互的入口：

```ts
export interface AiChatAdapter {
  loadConversations?: () => Promise<AiConversation[]>;
  loadMessages?: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (payload: {
    conversation: AiConversation;
    prompt: string;
    model: string;
    history: ChatMessage[];
  }) => Promise<ChatMessage>;
  regenerate?: (payload: { ... }) => Promise<ChatMessage>;
  clearConversation?: (conversation: AiConversation) => Promise<void>;
}
```

- **loadConversations**：返回会话列表；若未实现，可通过 `initialConversations` 传入静态数据。
- **loadMessages**：按需加载会话内消息；未实现时，组件会回退到 `initialMessages`。
- **sendMessage**：必填，实现向后端发送问题的逻辑，并返回助手消息。
- **regenerate**：可选，重新生成单条助手回复。
- **clearConversation**：可选，用于同步清空后端会话。

组件会自动处理并发、加载状态和失败反馈。若后端接口支持分页或流式，可在适配器层进一步扩展。

## 接入建议

1. 在业务层封装 API，例如 `conversationService`、`messageService`。
2. 使用 `AiChatPanel` 时传入封装好的 `adapter`。
3. 根据需要，在 `message-send`、`conversation-create` 等事件里同步业务状态或上报。
4. 若需要支持分页或消息上拉加载，可拓展 `loadMessages` 返回的结构，或在组件外层组合虚拟滚动方案。

## 预览示例

查看 `app/pages/chat/preview.vue`，其中使用了模拟接口以演示完整流程，可根据注释快速对接真实 API。该页面也展示了如何将 mock 数据与组件内置状态同步。
