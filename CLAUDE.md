# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在处理此代码仓库时提供指导。

## 项目概述

这是一个基于 Nuxt 4 的 AI 代码生成聊天应用，集成了多个 LLM 提供商（SiliconFlow、DeepSeek、Ollama、阿里百炼）并支持 MCP（Model Context Protocol）工具调用功能。

## 基本命令

```bash
# 安装依赖（仅使用 pnpm）
pnpm install

# 开发服务器
pnpm dev -o

# 生产环境构建
pnpm build

# 生成静态站点
pnpm generate

# 预览生产构建
pnpm preview
```

## 架构概述

### 前端架构（Nuxt 4 应用结构）
- **app/** - 遵循新的扁平结构的 Nuxt 4 应用目录
  - **composables/useChat.ts** - 核心聊天功能，支持流式传输、工具调用集成和消息管理
  - **stores/conversation.ts** - 管理对话状态、消息和会话持久化的 Pinia 存储
  - **pages/chat/index.vue** - 主聊天界面
  - **components/** - 可复用的 Vue 组件（CodePreview、ModelSelect）

### 后端架构（服务器 API）
- **server/api/chat.post.ts** - 使用 Vercel AI SDK 的主聊天端点，支持流式传输、工具调用和多提供商支持
- **server/utils/model.ts** - 支持 SiliconFlow、DeepSeek、Ollama 和灵积的动态模型提供商工厂
- **server/core/tools/** - MCP 工具集成和增强 AI 能力的本地工具
- **server/core/prompt/** - AI 生成的提示模板

### 共享代码
- **shared/types/model.ts** - 集中的模型配置和提供商定义
- **shared/utils/** - 用于代码处理、模板处理和字符串操作的通用工具

## 关键技术模式

### 模型提供商系统
应用程序使用动态模型提供商架构，其中模型在 `shared/types/model.ts` 中配置，并通过 `server/utils/model.ts` 中的工厂模式实例化。支持推理提取的中间件（例如 `<think>` 标签）。

### 流式聊天实现
前端在 `useChat.ts` 中使用原生 fetch API 处理流式响应。后端使用 Vercel AI SDK 的 `streamText`，集成工具调用和步骤限制（最多 5 步）。

### 工具调用架构
集成 MCP（Model Context Protocol）工具和本地工具。工具被延迟初始化并合并到 AI SDK 的工具系统中，用于对话期间的动态函数调用。

### 状态管理模式
使用带有仓库模式抽象的 Pinia。`PiniaConversationRepository` 实现 `IConversationRepository` 接口，允许依赖注入和可测试性。

## 环境配置

必需的环境变量（将 `.env.example` 复制到 `.env`）：
- `NUXT_SILICON_FLOW_API_URL` - SiliconFlow API 端点
- `NUXT_SILICON_FLOW_API_KEY` - SiliconFlow API 密钥
- `NUXT_DEEPSEEK_API_KEY` - DeepSeek API 密钥
- `NUXT_BAILIAN_API_URL` - 阿里巴巴百炼 API 端点
- `NUXT_BAILIAN_API_KEY` - 阿里巴巴百炼 API 密钥
- `NUXT_MCP_SERVER_DIRECTORY` - MCP 服务器项目路径

## 开发说明

- 仅使用 pnpm 作为包管理器（通过预安装脚本强制执行）
- 启用 Nuxt 自动导入的 TypeScript
- 通过 @nuxt/eslint 集成 ESLint
- 使用 Nuxt 集成的 UnoCSS 进行样式设计
- Element Plus X 作为 UI 组件库
- 当前未配置内置测试框架

### 目标

整个项目的最终目标是实现一个通过自然语言描述业务需求后，能够根据需求自动生成符合要求的代码的 AI 代码生成系统。

实现流程如下：
1. 解析用户需求，通过多轮会话发现需求中需要澄清的店，最终生成用户需求说明文档
2. 根据第一步的业务需求说明文档，进行业务建模，生成结构化的业务模型，包含实体、关系、业务流程、业务规则等信息
3. 根据第二步的业务模型，生成对应的代码实现
4. 代码生成完成后，进行代码质量检查和测试

### agent说明

所有的功能模块都需要有对应的 agent 来实现，agent 负责根据用户输入和上下文，调用相应的工具和模型，生成代码或回答问题，服务端的接口实际上是 agent 的调用。

一般的，agent 的返回应当尽量通过 ai-sdk 的 streamText 函数来创建流式返回，这样可以避免服务端长时间await阻塞导致超时问题。

所有的 agent 都需要在 `server/core/agents` 目录下实现，单独使用一个目录放置相关代码，并创建 README.md 文件进行说明，每个 agent 都是一个独立的模块，负责处理特定的功能。每个 agent 目录下的 `index.ts` 文件作为入口文件，合理拆分文件，避免单个文件中的内容过于聚集。

