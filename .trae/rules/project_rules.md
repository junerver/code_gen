# AI代码生成应用 - 项目基础规则

## 项目概述

这是一个基于Nuxt.js 4的全栈AI代码生成应用，旨在通过对话式交互为用户生成高质量的代码。

## 技术栈

- **前端框架**: Nuxt.js 4 + Vue 3
- **UI组件库**: Element Plus (vue-element-plus-x)
- **代码规范**: ESLint
- **包管理器**: pnpm
- **开发工具**: Nuxt DevTools

## 目录结构规范

```
code_gen/
├── app/                    # Nuxt 4 应用目录
│   ├── app.vue            # 根组件
│   ├── assets/            # 静态资源
│   ├── components/        # 可复用组件
│   │   ├── ui/           # 基础UI组件
│   │   ├── chat/         # 聊天相关组件
│   │   └── code/         # 代码生成相关组件
│   ├── composables/       # 组合式函数
│   │   ├── useChat.ts    # 聊天功能
│   │   ├── useCodeGen.ts # 代码生成
│   │   └── useApi.ts     # API调用
│   ├── layouts/           # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── index.vue     # 主页
│   │   ├── chat/         # 聊天页面
│   │   └── history/      # 历史记录
│   ├── server/           # 服务端API
│   │   ├── api/          # API路由
│   │   └── middleware/   # 服务端中间件
│   └── utils/            # 工具函数
├── public/               # 公共静态文件
└── types/                # TypeScript类型定义
```

## 代码规范

### 1. 命名规范

- **文件命名**: 使用kebab-case (如: `chat-interface.vue`)
- **组件命名**: 使用PascalCase (如: `ChatInterface`)
- **变量/函数**: 使用camelCase (如: `generateCode`)
- **常量**: 使用UPPER_SNAKE_CASE (如: `API_BASE_URL`)
- **类型定义**: 使用PascalCase (如: `ChatMessage`)

### 2. Vue组件规范

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 导入依赖
import { ref, computed } from 'vue'
import type { ChatMessage } from '~/types'

// 定义props
interface Props {
  messages: ChatMessage[]
  loading?: boolean
}

const { messages, loading = true } = defineProps<Props>()


// 定义emits
const emit = defineEmits<{
  send: [message: string]
  clear: []
}>()

// 响应式数据
const inputValue = ref('')
// 模板ref
const childRef = useTemplateRef<InstanceType<typeof Child>>('childRef')
// 计算属性
const hasMessages = computed(() => props.messages.length > 0)

// 方法
const handleSend = () => {
  if (inputValue.value.trim()) {
    emit('send', inputValue.value)
    inputValue.value = ''
  }
}
</script>

<style scoped>
/* 组件样式 */
</style>
```

### 3. Composables规范

```typescript
/**
 * 聊天功能组合式函数
 * @returns 聊天相关的状态和方法
 */
export const useChat = () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)

  /**
   * 发送消息
   * @param content 消息内容
   */
  const sendMessage = async (content: string) => {
    loading.value = true
    try {
      // 发送逻辑
    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    sendMessage
  }
}
```

### 4. API路由规范

```typescript
// server/api/chat/send.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // 验证请求数据
    if (!body.message) {
      throw createError({
        statusCode: 400,
        statusMessage: '消息内容不能为空'
      })
    }

    // 处理业务逻辑
    const response = await processMessage(body.message)
    
    return {
      success: true,
      data: response
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: '服务器内部错误'
    })
  }
})
```

## 类型定义规范

```typescript
// types/chat.ts
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface CodeGenerationRequest {
  prompt: string
  language: string
  framework?: string
  requirements?: string[]
}

export interface CodeGenerationResponse {
  code: string
  explanation: string
  suggestions?: string[]
}
```

## 开发流程规范

### 1. 分支管理

- `main`: 主分支，用于生产环境
- `dev`: 开发分支，用于集成功能
- `feature/*`: 功能分支，用于开发新功能
- `hotfix/*`: 热修复分支，用于紧急修复

### 2. 提交规范

使用约定式提交格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(chat): 添加代码生成功能

- 实现基于AI的代码生成
- 支持多种编程语言
- 添加代码预览和下载功能
```

## 性能优化规范

### 1. 组件优化

- 使用`defineAsyncComponent`进行组件懒加载
- 合理使用`v-memo`和`v-once`指令
- 避免在模板中使用复杂的表达式

### 2. 数据管理

- 使用Pinia进行状态管理（如需要）
- 实现数据缓存机制
- 合理使用`computed`和`watch`

### 3. 网络优化

- 实现请求防抖和节流
- 使用适当的缓存策略
- 实现错误重试机制

## 安全规范

### 1. 输入验证

- 对所有用户输入进行验证和清理
- 防止XSS和注入攻击
- 实现适当的权限控制

### 2. API安全

- 实现请求频率限制
- 使用HTTPS进行数据传输
- 对敏感数据进行加密

## 测试规范

### 1. 单元测试

- 使用Vitest进行单元测试
- 测试覆盖率不低于80%
- 重点测试核心业务逻辑

### 2. 集成测试

- 测试API接口的正确性
- 测试组件间的交互
- 测试用户操作流程

## 部署规范

### 1. 环境配置

- 开发环境：用于日常开发
- 测试环境：用于功能测试
- 生产环境：用于正式发布

### 2. 构建优化

- 启用代码分割和懒加载
- 优化静态资源
- 配置适当的缓存策略

## 文档规范

### 1. 代码注释

- 所有公共函数必须添加JSDoc注释
- 复杂逻辑需要添加行内注释
- 组件需要添加功能说明

### 2. API文档

- 使用OpenAPI规范描述API
- 提供详细的请求/响应示例
- 及时更新文档内容

## 工具配置

### 1. ESLint配置

确保代码符合项目规范，配置包括：
- Vue 3规则
- TypeScript规则
- 自定义业务规则

### 2. 开发工具

推荐使用的开发工具：
- VS Code + Volar插件
- Vue DevTools
- Nuxt DevTools

## 注意事项

1. **保持代码简洁**: 遵循KISS原则，避免过度设计
2. **注重用户体验**: 优化加载速度和交互体验
3. **持续学习**: 关注Nuxt.js和Vue.js的最新发展
4. **团队协作**: 保持良好的沟通和代码审查习惯
5. **安全第一**: 始终将安全性放在首位

---

本规范将随着项目发展不断完善和更新。所有团队成员都应严格遵守这些规范，以确保项目的高质量和可维护性。