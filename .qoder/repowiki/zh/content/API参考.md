# API参考

<cite>
**本文档中引用的文件**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31) - *更新以支持模型参数和工具执行*
- [model.ts](file://server/utils/model.ts#L1-L27) - *定义siliconflow模型工厂*
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33) - *新增模板工具集成*
- [template-gen.ts](file://server/core/prompt/template-gen.ts#L1-L82) - *系统提示词逻辑*
- [useChat.ts](file://app/composables/useChat.ts#L1-L371) - *前端调用逻辑，支持模型选择*
- [chat.ts](file://app/types/chat.ts#L1-L21) - *消息数据结构*
- [conversation.ts](file://app/stores/conversation.ts#L1-L318) - *会话状态管理*
- [conversation.ts](file://app/types/conversation.ts#L1-L79) - *会话类型定义*
- [nuxt.config.ts](file://nuxt.config.ts#L1-L24) - *运行时配置*
- [model.ts](file://shared/types/model.ts#L1-L50) - *支持的模型ID列表*
</cite>

## 更新摘要
**已更新内容**  
- 更新了API端点分析、前端交互分析和数据结构分析部分，以反映新增的模型参数和工具执行功能
- 新增了工具执行功能分析部分
- 更新了故障排除指南以包含新功能的排查建议
- 所有文件引用均已更新，标注了修改状态

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖分析](#依赖分析)
7. [性能考量](#性能考量)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介
本文档为 `/api/chat` 端点提供完整的 RESTful API 参考文档。该端点用于处理用户与 AI 助手之间的聊天交互，支持流式响应以实现逐字输出效果。API 接收包含消息历史的 JSON 请求体，通过调用外部 AI 模型服务生成回复，并以 `text/event-stream` 格式返回流式数据。新增功能包括前端可指定AI模型和集成模板工具执行。前端通过 `useChat` 组合式函数进行调用，结合 Pinia 状态管理实现会话持久化和消息同步。本 API 为内部使用，不对外公开。

## 项目结构
项目采用 Nuxt 3 框架构建，遵循典型的分层架构设计，分为前端（`app`）、服务端（`server`）和共享资源（`shared`）三大模块。

```
mermaid
graph TB
subgraph "前端 (app)"
A[components]
B[composables]
C[pages]
D[stores]
E[types]
end
subgraph "服务端 (server)"
F[api]
G[utils]
H[core]
end
subgraph "共享资源 (shared)"
I[types]
J[utils]
end
F --> G : "调用模型工具"
G --> H/prompt : "使用系统提示词"
H/tools --> H/prompt : "执行模板工具"
A --> B : "使用useChat"
B --> F : "调用/api/chat"
D --> B : "提供会话状态"
```

**图示来源**  
- [server/api/chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [app/composables/useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [shared/prompt/template-gen.ts](file://shared/prompt/template-gen.ts#L1-L82)

## 核心组件
核心功能由服务端 API 处理器、AI 模型集成、前端聊天逻辑和会话状态管理四部分构成。`chat.post.ts` 是核心 API 入口，负责接收请求并流式返回 AI 响应；`useChat.ts` 封装了前端交互逻辑；`conversation.ts` 管理会话数据；`model.ts` 配置 AI 模型连接。新增 `mcp-tools.ts` 实现模板工具集成。

**本节来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [conversation.ts](file://app/stores/conversation.ts#L1-L318)
- [model.ts](file://server/utils/model.ts#L1-L27)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

## 架构概览
系统采用前后端分离架构，前端通过 Vue 3 和 Nuxt 3 构建用户界面，后端通过 Nitro Server 提供 API 服务。聊天流程如下：用户在页面输入消息 → `useChat` 添加消息并调用 `/api/chat` → 服务端读取请求体 → 使用 `siliconflow` 模型调用 AI → 通过 `streamText` 流式返回 → 前端解析 `text/event-stream` 并逐段更新消息。新增流程：前端传递模型参数 → API 使用指定模型 → 集成模板工具执行代码生成任务。

```
mermaid
sequenceDiagram
participant 用户
participant 前端 as 前端 (useChat)
participant API as /api/chat
participant AI as AI 模型服务
participant 工具 as 模板工具
用户->>前端 : 输入消息并发送
前端->>前端 : 添加用户消息到状态
前端->>API : POST /api/chat (含model参数)
API->>AI : streamText(消息历史, 指定模型)
API->>工具 : initMcpTools()
loop 流式响应
AI-->>API : data : {type : text-delta, delta : "部分文本"}
API-->>前端 : data : {type : text-delta, delta : "部分文本"}
前端->>前端 : 更新助手消息内容
end
AI-->>API : data : [DONE]
API-->>前端 : 关闭流
前端->>前端 : 完成消息渲染
```

**图示来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

## 详细组件分析

### API端点分析
`/api/chat.post.ts` 是处理聊天请求的核心服务端文件，使用 Nuxt 的 `defineLazyEventHandler` 和 `defineEventHandler` 创建异步处理函数。新增功能：接收前端传递的 `model` 参数以指定AI模型，并集成模板工具执行。

#### 请求处理流程
```
mermaid
flowchart TD
Start([接收到POST请求]) --> ParseBody["解析请求体 (readBody)"]
ParseBody --> ExtractMessages["提取messages和model字段"]
ExtractMessages --> InitTools["初始化模板工具initMcpTools"]
InitTools --> StreamAI["调用streamText生成流"]
StreamAI --> SetModel["使用siliconflow(model)"]
SetModel --> SetSystem["设置系统提示词templateGenPrompt"]
SetSystem --> SetMessages["传入用户消息历史"]
StreamAI --> ReturnStream["返回UIMessageStreamResponse"]
ReturnStream --> End([响应text/event-stream])
```

**图示来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)

**本节来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)

### 前端交互分析
`useChat.ts` 是组合式函数，封装了发送消息、重新生成、删除消息等完整聊天功能。新增 `selectedModel` 状态以支持模型选择，并在 `generateResponse` 中将模型参数传递给API。

#### 发送消息流程
```
mermaid
sequenceDiagram
participant UI as 用户界面
participant Chat as useChat
participant Store as conversationStore
participant API as /api/chat
UI->>Chat : sendMessage(content)
Chat->>Store : addUserMessage(content)
Chat->>Store : addAssistantMessage()(占位)
Chat->>API : fetch('/api/chat', { method : 'POST', body : {model, messages} })
API-->>Chat : 返回流式响应
loop 读取流数据
Chat->>Chat : 解析SSE数据块
Chat->>Store : updateAssistantMessage(增量内容)
end
Chat->>Store : 设置消息完成状态
```

**图示来源**  
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

**本节来源**  
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)

### 数据结构分析
系统定义了清晰的类型接口，确保前后端数据一致性。新增 `SiliconflowChatModelIds` 类型定义支持的模型列表。

```
mermaid
classDiagram
class ChatMessage {
+id : string
+content : string
+role : 'user' | 'assistant' | 'system'
+timestamp : Date
+reasoningContent? : string
+reasoningStatus? : 'start' | 'thinking' | 'end' | 'error'
}
class Conversation {
+id : string
+title : string
+group? : string
+lastMessage? : string
+createdAt : Date
+updatedAt : Date
+config? : ConversationConfig
}
class ConversationConfig {
+model? : string
+systemPrompt? : string
+temperature? : number
+maxTokens? : number
}
class ModelOption {
+id : SiliconflowChatModelIds
+name : string
+description : string
}
ChatMessage "1" -- "0..*" Conversation : 属于
```

**图示来源**  
- [chat.ts](file://app/types/chat.ts#L1-L21)
- [conversation.ts](file://app/types/conversation.ts#L1-L79)
- [model.ts](file://shared/types/model.ts#L1-L50)

**本节来源**  
- [chat.ts](file://app/types/chat.ts#L1-L21)
- [conversation.ts](file://app/types/conversation.ts#L1-L79)
- [model.ts](file://shared/types/model.ts#L1-L50)

### 工具执行功能分析
新增 `mcp-tools.ts` 文件实现模板工具集成，通过 `experimental_createMCPClient` 创建MCP客户端，支持代码模板生成等工具调用。

#### 工具初始化流程
```
mermaid
flowchart TD
Start([API请求]) --> InitTools["initMcpTools()"]
InitTools --> CreateClient["创建MCP客户端"]
CreateClient --> ExecCommand["执行uv run template_mcp命令"]
ExecCommand --> GetTools["获取可用工具列表"]
GetTools --> ReturnTools["返回工具集"]
ReturnTools --> StreamAI["在streamText中使用工具"]
```

**图示来源**  
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)

**本节来源**  
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

## 依赖分析
系统依赖关系清晰，各模块职责分明。

```
mermaid
graph TD
A[chat.post.ts] --> B[model.ts]
A --> C[template-gen.ts]
A --> D[mcp-tools.ts]
D --> C : "使用模板"
B --> E[nuxt.config.ts]
E --> F[运行时配置]
G[useChat.ts] --> A
G --> H[conversation.ts]
H --> I[conversationStore]
```

**图示来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [model.ts](file://server/utils/model.ts#L1-L27)
- [nuxt.config.ts](file://nuxt.config.ts#L1-L24)

**本节来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [model.ts](file://server/utils/model.ts#L1-L27)
- [nuxt.config.ts](file://nuxt.config.ts#L1-L24)

## 性能考量
- **流式响应**：使用 `text/event-stream` 避免长时间等待，提升用户体验。
- **状态管理**：Pinia 确保状态集中管理，避免重复请求。
- **模型调用**：通过 `siliconflow` 配置外部 AI 服务，解耦核心逻辑。
- **前端解析**：使用 `TextDecoder` 和 `reader.read()` 高效处理流数据，避免内存溢出。
- **工具集成**：异步初始化工具，避免阻塞主请求流程。

## 故障排除指南
- **400 错误**：检查请求体是否包含 `messages` 数组，且每条消息有 `role` 和 `content`。
- **500 错误**：确认 `nuxt.config.ts` 中配置了 `siliconFlowApiUrl` 和 `siliconFlowApiKey`。
- **流式中断**：检查网络连接或 AI 服务可用性。
- **消息不更新**：确认 `updateAssistantMessage` 被正确调用，检查消息 ID 是否匹配。
- **解析失败**：SSE 数据格式错误，检查 `line.startsWith('data: ')` 和 JSON 解析逻辑。
- **模型无效**：检查传递的 `model` 参数是否在 `AvailableModels` 列表中。
- **工具初始化失败**：确认 `template_mcp` 服务已启动且 `uv` 命令可用。

**本节来源**  
- [chat.post.ts](file://server/api/chat.post.ts#L1-L31)
- [useChat.ts](file://app/composables/useChat.ts#L1-L371)
- [mcp-tools.ts](file://server/core/tools/mcp-tools.ts#L1-L33)

## 结论
`/api/chat` 是一个功能完整的内部聊天 API，实现了流式 AI 响应、会话管理、错误处理等核心功能。通过最新更新，增加了模型选择和工具执行能力，提升了灵活性和功能性。其设计清晰，前后端职责分明，易于维护和扩展。建议未来可增加会话配置传递、多模型支持、请求验证等特性以增强灵活性。