# AiChatPanel 组件

通用 AI 会话面板组件，支持流式响应和多适配器架构。

## 特性

- ✅ **流式响应支持**：完整支持逐字符流式输出，提供流畅的用户体验
- ✅ **多模型支持**：集成 ModelSelect 组件，支持多种 AI 模型选择
- ✅ **会话管理**：支持多会话创建、切换和删除
- ✅ **适配器模式**：通过适配器接口对接不同的 AI 服务
- ✅ **响应式设计**：基于 Element Plus 的现代化 UI
- ✅ **TypeScript 支持**：完整的类型定义和类型安全
- ✅ **消息历史**：完整的消息历史记录和上下文管理
- ✅ **错误处理**：完善的错误处理和用户提示
- ✅ **可定制性**：支持自定义头像、标题、占位符等

## 基础用法

```vue
<template>
  <AiChatPanel
    v-model="model"
    title="AI 助手"
    placeholder="请输入您的问题..."
    :adapter="adapter"
    @message-send="handleMessageSend"
  />
</template>

<script setup>
import { ref } from 'vue'
import { AiChatPanel } from '~/components/ai-chat'
import type { AiChatAdapter } from '~/components/ai-chat/types'

const model = ref('gpt-4')

const adapter: AiChatAdapter = {
  async sendMessage({ prompt, onMessage }) {
    // 实现您的 AI 接口调用逻辑
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })

    if (onMessage) {
      // 处理流式响应
      const reader = response.body?.getReader()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        content += chunk

        onMessage({
          role: 'assistant',
          content,
          typing: true
        }, { phase: 'update' })
      }

      onMessage({
        role: 'assistant',
        content,
        typing: false
      }, { phase: 'complete' })

      return { role: 'assistant', content }
    }

    return await response.json()
  }
}

const handleMessageSend = ({ conversation, response }) => {
  console.log('收到回复:', response.content)
}
</script>
```

## Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| title | string | 'AI 会话' | 面板标题 |
| placeholder | string | '请输入您的问题...' | 输入框占位符 |
| adapter | AiChatAdapter | 内置适配器 | 数据适配器 |
| initialConversations | AiConversation[] | [] | 初始会话列表 |
| initialMessages | ConversationMessageMap | {} | 初始消息映射 |
| autoLoadConversations | boolean | true | 是否自动加载会话 |
| avatars | AiChatAvatars | 默认头像 | 自定义头像配置 |

## 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| conversation-create | conversation: AiConversation | 创建新会话时触发 |
| conversation-change | conversation: AiConversation | 切换会话时触发 |
| message-send | { conversation, request, response } | 发送消息并收到回复时触发 |
| clear | conversation: AiConversation | 清空会话时触发 |
| update | model: AvailableModelNames | 模型变更时触发 |

## 适配器接口

适配器是组件对接不同 AI 服务的核心接口：

```typescript
interface AiChatAdapter {
  // 加载会话列表（可选）
  loadConversations?: () => Promise<AiConversation[]>

  // 加载指定会话的消息（可选）
  loadMessages?: (conversationId: string) => Promise<ChatMessage[]>

  // 发送消息（必需）
  sendMessage: (payload: {
    conversation: AiConversation
    prompt: string
    model: string
    history: ChatMessage[]
    onMessage?: (message: ChatMessage, meta: AiChatStreamMeta) => void
  }) => Promise<ChatMessage>

  // 重新生成消息（可选）
  regenerate?: (payload: {
    conversation: AiConversation
    message: ChatMessage
    model: string
    history: ChatMessage[]
    onMessage?: (message: ChatMessage, meta: AiChatStreamMeta) => void
  }) => Promise<ChatMessage>

  // 清空会话（可选）
  clearConversation?: (conversation: AiConversation) => Promise<void>
}
```

## 流式响应实现

### 关键要点

1. **立即返回策略**：适配器应立即返回基础消息对象，不等待流式完成
2. **流式更新回调**：通过 `onMessage` 回调实时更新消息内容
3. **状态管理**：使用 `typing` 状态控制 UI 显示
4. **错误处理**：正确处理流式过程中的错误

### 完整示例

```typescript
const streamingAdapter: AiChatAdapter = {
  async sendMessage({ prompt, onMessage }) {
    // 创建基础消息对象
    const baseMessage = {
      id: generateId(),
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      typing: true
    }

    if (onMessage) {
      // 启动流式处理
      processStream(prompt, (chunk) => {
        baseMessage.content += chunk

        onMessage(
          { ...baseMessage },
          { phase: 'update' }
        )
      }).then(() => {
        // 流式完成
        onMessage(
          { ...baseMessage, typing: false },
          { phase: 'complete' }
        )
      }).catch(error => {
        console.error('Stream error:', error)
      })

      return baseMessage
    }

    // 非流式响应
    return await getCompleteResponse(prompt)
  }
}

async function processStream(prompt: string, onChunk: (chunk: string) => void) {
  // 实现您的流式处理逻辑
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    onChunk(chunk)
  }
}
```

## 消息类型

```typescript
interface ChatMessage {
  id: string                  // 消息唯一标识
  role: 'user' | 'assistant'  // 消息角色
  content: string             // 消息内容
  timestamp: Date            // 时间戳
  typing?: boolean           // 是否正在输入（流式状态）
  isMarkdown?: boolean       // 是否为 Markdown 格式
  placement: 'start' | 'end' // 消息位置
  avatar?: string            // 头像 URL
  variant: 'outlined' | 'filled' // 消息样式
  maxWidth?: string          // 最大宽度
}
```

## 会话管理

```typescript
interface AiConversation {
  id: string          // 会话唯一标识
  title: string       // 会话标题
  group?: string      // 会话分组
  disabled?: boolean  // 是否禁用
  lastMessage?: string // 最后一条消息预览
  updatedAt?: string | number | Date // 更新时间
}
```

## 自定义配置

### 自定义头像

```vue
<template>
  <AiChatPanel
    :avatars="{
      user: 'https://example.com/user-avatar.png',
      assistant: 'https://example.com/ai-avatar.png'
    }"
  />
</template>
```

### 初始数据

```vue
<template>
  <AiChatPanel
    :initial-conversations="conversations"
    :initial-messages="messages"
  />
</template>

<script setup>
const conversations = [
  {
    id: 'conv-1',
    title: '编程助手',
    lastMessage: '如何优化这段代码？',
    updatedAt: new Date()
  }
]

const messages = {
  'conv-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: '如何优化这段代码？',
      timestamp: new Date()
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: '以下是优化建议...',
      timestamp: new Date()
    }
  ]
}
</script>
```

## 最佳实践

### 1. 流式响应优化

```typescript
// ✅ 推荐：立即返回，后台流式更新
if (onMessage) {
  streamResponse(prompt, onMessage)
  return baseMessage
}

// ❌ 避免：等待流式完成
if (onMessage) {
  await streamResponse(prompt, onMessage)
  return completeMessage
}
```

### 2. 错误处理

```typescript
try {
  const response = await fetch('/api/chat', options)
  // 处理响应
} catch (error) {
  console.error('API Error:', error)
  // 返回错误消息
  return {
    role: 'assistant',
    content: '抱歉，服务暂时不可用，请稍后再试。'
  }
}
```

### 3. 消息状态管理

```typescript
// 流式开始
onMessage({
  ...baseMessage,
  content: '',
  typing: true
}, { phase: 'start' })

// 流式更新
onMessage({
  ...baseMessage,
  content: accumulatedContent,
  typing: true
}, { phase: 'update' })

// 流式完成
onMessage({
  ...baseMessage,
  content: finalContent,
  typing: false
}, { phase: 'complete' })
```

## 常见问题

### Q: 如何实现真正的流式响应？

A: 参考上文的"流式响应实现"部分，关键是要使用 `ReadableStream` 或类似的流式 API，并通过 `onMessage` 回调实时更新内容。

### Q: 组件不支持流式响应怎么办？

A: 组件完全向后兼容非流式响应。如果不提供 `onMessage` 回调，适配器可以直接返回完整消息。

### Q: 如何处理网络错误？

A: 在适配器的 `try-catch` 块中处理错误，返回友好的错误消息给用户。

### Q: 如何持久化会话数据？

A: 适配器的 `loadConversations` 和 `loadMessages` 方法应该从您的数据存储（数据库、本地存储等）加载数据，并在消息发送后更新存储。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础会话功能
- 流式响应支持
- 多适配器架构

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个组件。

## 许可证

MIT License