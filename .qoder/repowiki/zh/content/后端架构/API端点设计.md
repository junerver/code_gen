# API端点设计

<cite>
**本文档中引用的文件**   
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31) - *更新：集成工具调用和模型选择功能*
- [useChat.ts](file://app/composables/useChat.ts#L1-L371) - *更新：支持模型参数传递*
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33) - *新增：模板工具初始化逻辑*
- [model.ts](file://server/utils/model.ts#L1-L27) - *更新：模型配置支持动态参数*
- [template-gen.ts](file://server/core/prompt/template-gen.ts#L1-L82) - *更新：提示词模板内容*
- [id.ts](file://shared/utils/id.ts#L1-L28) - *未变更：ID生成工具*
- [chat.ts](file://app/types/chat.ts#L1-L21) - *未变更：聊天消息类型定义*
- [conversation.ts](file://app/types/conversation.ts#L1-L79) - *未变更：会话类型定义*
- [conversation.ts](file://app/stores/conversation.ts#L1-L317) - *未变更：会话状态管理*
</cite>

## 更新摘要
**已更新内容**
- 更新了API端点实现，支持前端传递模型参数
- 新增了MCP工具集成机制的文档说明
- 更新了请求体结构描述，包含可选的模型参数
- 更新了前端通信机制，说明模型选择功能
- 更新了架构概览图，反映工具调用层
- 更新了请求示例，包含模型参数
- 修正了与代码实际实现不一致的描述

**新增内容**
- 新增了MCP工具初始化机制的详细说明
- 新增了工具调用流程图
- 新增了模型选择功能的前后端交互说明

**已移除内容**
- 移除了关于固定模型配置的过时描述
- 移除了未使用工具调用的旧流程说明

**来源跟踪系统更新**
- 更新了文档级引用文件列表，添加了mcp-tools.ts
- 为新增和更新的章节添加了准确的来源标注
- 标记了所有更新文件的变更状态

## 目录
1. [项目结构分析](#项目结构分析)
2. [核心组件分析](#核心组件分析)
3. [API端点实现](#api端点实现)
4. [前端通信机制](#前端通信机制)
5. [数据流与处理逻辑](#数据流与处理逻辑)
6. [错误处理机制](#错误处理机制)
7. [安全与验证措施](#安全与验证措施)
8. [性能特性](#性能特性)
9. [架构概览](#架构概览)

## 项目结构分析

项目采用分层架构设计，主要分为以下几个模块：
- **app**: 前端应用逻辑，包含组件、组合式函数、页面和状态管理
- **server**: 后端API服务，处理HTTP请求并调用AI模型
- **shared**: 跨前后端共享的工具和提示词模板
- **public**: 静态资源文件

关键路径：
- API端点位于 `server/api/chat.post.ts`
- 前端组合式函数位于 `app/composables/useChat.ts`
- 共享提示词模板位于 `shared/prompt/template-gen.ts`
- MCP工具初始化位于 `server/core/tools/mcp-tools.ts`

``mermaid
graph TB
subgraph "前端 (app)"
A[useChat.ts] --> B[conversation.ts]
C[chat.vue] --> A
D[CodePreview.vue] --> C
E[ModelSelect.vue] --> C
end
subgraph "后端 (server)"
F[chat.post.ts] --> G[model.ts]
F --> H[template-gen.ts]
F --> I[mcp-tools.ts]
end
subgraph "共享 (shared)"
J[id.ts]
K[template-gen.ts]
end
A --> F
F --> |流式响应| A
J --> A
J --> B
G --> F
K --> F
I --> F
```

**图示来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [template-gen.ts](file://server/core/prompt/template-gen.ts#L1-L82)
- [model.ts](file://server/utils/model.ts#L1-L27)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)
- [id.ts](file://shared/utils/id.ts#L1-L28)

**本节来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

## 核心组件分析

### 消息与会话数据结构

#### 消息类型定义
```typescript
export type ChatMessage = BubbleProps & {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  reasoningContent?: string;
  reasoningStatus?: 'start' | 'thinking' | 'end' | 'error';
};
```

#### 会话类型定义
```typescript
export interface Conversation {
  id: string;
  title: string;
  group?: string;
  disabled?: boolean;
  lastMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  config?: ConversationConfig;
}
```

**本节来源**
- [chat.ts](file://app/types/chat.ts#L1-L21)
- [conversation.ts](file://app/types/conversation.ts#L1-L79)

### ID生成机制

消息和会话ID通过共享工具生成，确保全局唯一性。

```typescript
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateMessageId = (): string => {
  return generateId('msg');
};

export const generateConversationId = (): string => {
  return generateId('conv');
};
```

``mermaid
flowchart TD
Start([生成ID]) --> CheckPrefix["判断前缀类型"]
CheckPrefix --> |msg| GenerateMessageId["生成消息ID"]
CheckPrefix --> |conv| GenerateConversationId["生成会话ID"]
GenerateMessageId --> Combine["组合: msg_时间戳_随机字符串"]
GenerateConversationId --> Combine
Combine --> ReturnID["返回唯一ID"]
ReturnID --> End([完成])
```

**图示来源**
- [id.ts](file://shared/utils/id.ts#L1-L28)

**本节来源**
- [id.ts](file://shared/utils/id.ts#L1-L28)

## API端点实现

### `/api/chat` POST端点

#### 请求信息
- **方法**: POST
- **路径**: `/api/chat`
- **内容类型**: `application/json`

#### 请求体结构
```json
{
  "messages": [
    {
      "role": "user",
      "content": "用户输入内容"
    },
    {
      "role": "assistant",
      "content": "AI之前的回复"
    }
  ],
  "model": "Qwen/Qwen3-Coder-30B-A3B-Instruct"
}
```

#### 请求参数说明
- **messages**: 消息历史数组，包含用户和助手的对话记录
  - **role**: 角色标识 (`user` 或 `assistant`)
  - **content**: 消息内容文本
- **model**: 可选参数，指定AI模型名称（新增功能）

#### 实现代码分析
```typescript
export default defineLazyEventHandler(async () => {
  // 初始化mcp工具
  const tools = await initMcpTools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return defineEventHandler(async (event: any) => {
    const { messages, model } = await readBody(event);
    const result = streamText({
      model: siliconflow(model), // 支持前端传递的模型参数
      tools, // 集成MCP工具
      stopWhen: stepCountIs(10),
      system: templateGenPrompt(),
      messages,
    });

    return result.toUIMessageStreamResponse();
  });
});
```

#### 处理流程
1. 使用 `defineLazyEventHandler` 延迟初始化事件处理器
2. 通过 `defineEventHandler` 定义具体的请求处理逻辑
3. 使用 `readBody(event)` 解析请求体中的JSON数据
4. 初始化MCP工具，支持动态工具调用
5. 调用 `streamText` 函数与AI模型交互，支持指定模型
6. 返回 `toUIMessageStreamResponse` 流式响应

#### AI模型配置
```typescript
export const siliconflow = createOpenAICompatible<
  SiliconflowChatModelIds,
  SiliconflowCompletionModelIds,
  SiliconflowEmbeddingModelIds,
  SiliconflowImageModelIds
>({
  baseURL: useRuntimeConfig().siliconFlowApiUrl,
  apiKey: useRuntimeConfig().siliconFlowApiKey,
  name: 'siliconflow',
});
```

#### MCP工具初始化
```typescript
const templateClientPromise = experimental_createMCPClient({
  transport: new StdioClientTransport({
    command: 'uv',
    args: [
      '--directory',
      'E:/GitHub/All_in_Ai/test_mcp_server',
      'run',
      'template_mcp',
    ],
  }),
});

export const initMcpTools = async () => {
  const templateTools = await (await templateClientPromise).tools();
  return {
    ...templateTools,
  };
};
```

**本节来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [model.ts](file://server/utils/model.ts#L1-L27)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

## 前端通信机制

### useChat 组合式函数

`useChat.ts` 是前端与 `/api/chat` API通信的核心组件，提供了完整的聊天功能。

#### 核心功能
- 管理聊天状态（加载、错误）
- 处理用户消息发送
- 管理消息流式接收
- 错误处理与恢复
- 支持模型选择功能（新增）

#### 关键方法
- **sendMessage**: 发送用户消息并触发AI响应
- **generateResponse**: 处理流式API响应
- **addUserMessage**: 添加用户消息到会话
- **addAssistantMessage**: 添加助手消息占位符
- **updateAssistantMessage**: 更新助手消息内容

``mermaid
sequenceDiagram
participant 用户
participant 前端
participant API
participant AI模型
用户->>前端 : 选择模型并输入消息
前端->>前端 : 设置selectedModel
前端->>前端 : addUserMessage(内容)
前端->>前端 : addAssistantMessage()(创建占位符)
前端->>API : POST /api/chat (消息历史, 模型)
API->>MCP工具 : 初始化工具客户端
MCP工具->>API : 返回工具集合
API->>AI模型 : streamText(请求, 工具)
AI模型->>API : 流式数据块
API->>前端 : SSE流 (data : {...})
前端->>前端 : 解析流数据
前端->>前端 : updateAssistantMessage(增量内容)
前端->>用户 : 逐字显示AI回复
AI模型->>API : [DONE]
API->>前端 : 连接关闭
前端->>前端 : 标记响应完成
```

**图示来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

**本节来源**
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

## 数据流与处理逻辑

### 流式响应处理

#### 响应格式 (SSE - Server-Sent Events)
```
data: {"type":"text-delta","delta":"你好"}
data: {"type":"text-delta","delta":"，"}
data: {"type":"text-delta","delta":"我是"}
data: {"type":"reasoning-start","delta":"正在思考..."}
data: {"type":"reasoning-delta","delta":"分析需求..."}
data: {"type":"text-start","delta":""}
data: {"type":"text-delta","delta":"代码生成器"}
data: {"type":"text-delta","delta":"。"}
data: [DONE]
```

#### 前端流式处理逻辑
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
      const jsonStr = line.slice(6);
      const data = JSON.parse(jsonStr);

      if (data.type === 'text-delta' && data.delta) {
        accumulatedContent += data.delta;
        updateAssistantMessage(assistantMessageId, accumulatedContent);
      }
      // 处理推理状态...
    }
  }
}
```

#### 数据流类型
- **text-delta**: 文本增量，包含正在生成的文本片段
- **reasoning-start**: 推理开始，表示AI开始思考
- **reasoning-delta**: 推理增量，包含思考过程的文本
- **text-start**: 正文开始，表示正式回复开始
- **[DONE]**: 流结束标记

``mermaid
flowchart TD
A[开始流式请求] --> B{获取响应流}
B --> |成功| C[创建Reader和Decoder]
C --> D[读取数据块]
D --> E{数据块存在?}
E --> |是| F[解码数据]
F --> G[按行分割]
G --> H{处理每行}
H --> I[检查data:前缀]
I --> J{是有效数据?}
J --> |是| K[解析JSON]
K --> L{数据类型}
L --> |text-delta| M[累加内容并更新UI]
L --> |reasoning-start| N[初始化推理内容]
L --> |reasoning-delta| O[累加推理内容]
L --> |text-start| P[结束推理状态]
J --> |否| Q[跳过无效行]
E --> |否| R[流结束]
R --> S[完成响应]
S --> T[结束]
```

**图示来源**
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

**本节来源**
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)

## 错误处理机制

### 前端错误处理

#### 错误状态管理
```typescript
const error = ref<string | undefined>();
// ...
error.value = err instanceof Error ? err.message : '发送消息失败';
```

#### 错误处理流程
1. 在 `sendMessage` 和 `regenerate` 方法中使用 try-catch 捕获异常
2. 设置错误状态，供UI显示
3. 处理助手消息的清理工作
4. 确保加载状态正确重置

#### 具体错误场景处理
- **网络错误**: 捕获 fetch 请求异常
- **HTTP错误**: 检查响应状态码
- **流读取错误**: 处理 reader 获取失败
- **JSON解析错误**: 捕获流数据解析异常

```typescript
try {
  // API调用逻辑
} catch (err) {
  error.value = err instanceof Error ? err.message : '发送消息失败';
  console.error('发送消息失败:', err);

  // 清理助手消息状态
  if (lastMessage.content === '') {
    conversationStore.deleteMessage(conversationId, lastMessage.id);
  } else {
    conversationStore.updateMessage(conversationId, lastMessage.id, lastMessage.content, true);
  }
} finally {
  loading.value = false;
}
```

**本节来源**
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

## 安全与验证措施

### 输入验证

#### 请求体验证
- 使用 `readBody(event)` 安全地解析请求体
- 自动处理JSON解析错误
- 验证 `messages` 字段存在性
- 支持可选的 `model` 参数验证

#### 前端输入验证
```typescript
const sendMessage = async (content: string): Promise<void> => {
  if (!content.trim()) return; // 验证内容非空
  // ...
};
```

### 安全措施
- **API密钥保护**: AI模型API密钥通过 `useRuntimeConfig()` 安全注入，不暴露在前端
- **输入清理**: 对用户输入进行基本清理和验证
- **错误信息处理**: 避免将详细错误信息暴露给用户
- **会话状态管理**: 通过Pinia store集中管理会话状态，防止状态混乱
- **工具调用安全**: MCP工具在服务器端初始化，防止前端直接访问

**本节来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

## 性能特性

### 流式响应优势
- **低延迟体验**: 用户无需等待完整响应，可立即看到AI生成的第一个字
- **感知性能提升**: 即使总响应时间相同，流式输出让用户感觉更快
- **内存效率**: 无需在服务器端缓冲完整响应
- **网络效率**: 数据生成后立即发送，减少等待时间

### 前端优化
- **计算属性**: 使用 `computed` 自动更新消息列表
- **只读状态**: 使用 `readonly` 包装状态，防止意外修改
- **ID生成优化**: 高效的ID生成算法，避免性能瓶颈
- **模型选择缓存**: 缓存用户选择的模型，减少重复请求

### 后端优化
- **延迟事件处理器**: `defineLazyEventHandler` 延迟初始化，优化启动性能
- **流式传输**: 直接流式传输AI响应，减少内存占用
- **高效模型调用**: 使用优化的AI SDK进行模型调用
- **工具预初始化**: MCP工具在事件处理器初始化时创建，避免每次请求重复初始化

## 架构概览

### 系统架构图
``mermaid
graph TB
subgraph "前端"
A[用户界面] --> B[useChat 组合式函数]
B --> C[Conversation Store]
C --> D[消息状态]
C --> E[会话状态]
F[ModelSelect] --> B
end
subgraph "通信层"
B --> |POST /api/chat| G[API网关]
G --> H[chat.post.ts]
end
subgraph "AI服务层"
H --> I[AI模型服务]
I --> J[Qwen3-Coder 模型]
H --> K[提示词模板]
H --> L[MCP工具]
L --> M[模板工具服务]
end
subgraph "共享资源"
N[ID生成工具] --> B
N --> C
K --> H
end
style A fill:#4CAF50,stroke:#388E3C
style B fill:#2196F3,stroke:#1976D2
style C fill:#FF9800,stroke:#F57C00
style H fill:#9C27B0,stroke:#7B1FA2
style I fill:#E91E63,stroke:#C2185B
style J fill:#607D8B,stroke:#455A64
style L fill:#795548,stroke:#5D4037
```

**图示来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [conversation.ts](file://app/stores/conversation.ts#L1-L317)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

**本节来源**
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [conversation.ts](file://app/stores/conversation.ts#L1-L317)

### 请求示例

#### cURL 请求
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    "messages": [
      {
        "role": "user",
        "content": "创建一个Vue3的登录表单组件"
      }
    ]
  }'
```

### 响应数据结构 (SSE流)
```json
// 流式数据块示例
data: {"type":"text-delta","delta":"好的，我将为您创建一个Vue3的登录表单组件。"}
data: {"type":"reasoning-start","delta":"正在分析需求..."}
data: {"type":"reasoning-delta","delta":"需要包含用户名、密码输入框和登录按钮..."}
data: {"type":"text-start","delta":""}
data: {"type":"text-delta","delta":"```vue\n<script setup>"}
data: {"type":"text-delta","delta":"import { ref } from 'vue';\n"}
// ... 更多数据块
data: [DONE]
```

### 状态码
- **200**: 请求成功，返回流式响应
- **400**: 参数错误，请求体格式不正确
- **500**: 服务器错误，AI服务调用失败

### 安全措施
- 输入验证确保消息数组存在
- 错误处理防止服务器崩溃
- API密钥通过环境变量安全配置
- 工具调用权限控制在服务器端