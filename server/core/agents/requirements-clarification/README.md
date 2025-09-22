# Requirements Clarification Agent

## 概述

需求澄清Agent是一个智能对话系统，负责通过多轮自然语言对话帮助用户明确和细化业务需求。它能够主动识别需求中的不清晰、不完整或不一致之处，并提出针对性的澄清问题，直到需求足够清晰，能够生成高质量的结构化需求文档。

## 核心功能

### 智能需求缺口识别
- 分析用户输入，识别需求的不完整性和模糊性
- 识别缺失的技术细节、实现差距和业务逻辑
- 检测未考虑的边界情况和性能/安全需求

### 主动澄清提问
- 基于需求分析结果，自动生成澄清问题
- 维护对话上下文，确保问题连贯性
- 支持多轮对话，逐步细化需求

### 需求确认检测
- 使用自然语言处理技术检测用户确认信号
- 识别常见的确认短语模式
- 自动触发需求建模流程

### 与需求建模Agent集成
- 需求确认后自动调用需求建模Agent
- 生成结构化的业务模型文档
- 包含实体、关系和业务规则定义

## 工作流程

```
用户输入需求 → 需求分析 → 识别澄清点 → 提出澄清问题
    ↓
用户回应 → 确认检测 → 需求确认 → 调用建模Agent → 生成结构化文档
    ↓
需求澄清完成
```

## 主要组件

### RequirementsClarificationAgent类

#### 核心方法

**processMessage(message, context)**
- 处理用户消息的主入口
- 维护对话状态和上下文
- 返回结构化的响应结果

**checkRequirementConfirmation(message)**
- 使用NLP检测用户是否确认需求完成
- 分析消息中的确认信号
- 返回布尔值表示确认状态

**analyzeCurrentRequirements(context)**
- 分析当前需求状态
- 识别需要澄清的领域
- 生成当前理解的摘要

**handleClarificationNeeded(context, analysis)**
- 处理需要澄清的情况
- 生成澄清问题
- 更新对话状态

**handleRequirementsComplete(context, analysis)**
- 处理需求完整的情况
- 生成需求理解摘要
- 请求用户确认

**handleRequirementConfirmation(context)**
- 处理需求确认
- 调用需求建模Agent
- 生成最终的需求文档

### 数据结构

**ConversationTurn**
```typescript
interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'clarification' | 'confirmation' | 'parsing' | 'document';
}
```

**ConversationContext**
```typescript
interface ConversationContext {
  conversationId: string;
  turns: ConversationTurn[];
  currentUnderstanding?: string;
  requirementDocument?: any;
  status: 'new' | 'clarifying' | 'confirmed' | 'parsing' | 'completed';
  confidence: number;
}
```

## 使用示例

### 基本使用

```typescript
import { RequirementsClarificationAgent } from './server/core/agents/requirements-clarification';

const agent = new RequirementsClarificationAgent({
  model: 'deepseek-chat',
  temperature: 0.3
});

// 处理用户消息
const result = await agent.processMessage('我想开发一个电商系统', {
  domain: '电子商务'
});

console.log(result.response);
// 可能返回澄清问题，如：
// "您希望开发什么类型的电商系统？B2C、B2B还是C2C？"
```

### 多轮对话

```typescript
// 第一轮
const result1 = await agent.processMessage('我想开发一个电商系统');

// 用户回应澄清问题
const result2 = await agent.processMessage('B2C电商系统，主要卖电子产品');

// 继续澄清
const result3 = await agent.processMessage('需要用户注册、商品管理、订单处理功能');

// 用户确认
const result4 = await agent.processMessage('是的，这样就可以了');

// 最终生成结构化需求文档
console.log(result4.requirementDocument);
```

## API接口

### 输入参数

```typescript
{
  message: string;                    // 用户消息
  context?: {
    domain?: string;                  // 业务领域
    previousMessages?: Array<{        // 历史消息
      role: 'user' | 'assistant';
      content: string;
      timestamp?: number;
    }>;
  };
}
```

### 输出结果

```typescript
{
  success: boolean;                   // 处理是否成功
  conversationId: string;             // 对话ID
  response: string;                   // AI响应内容
  status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';  // 当前状态
  clarificationQuestions?: string[];  // 澄清问题列表
  requirementDocument?: any;          // 需求文档
  confidence?: number;                // 置信度
}
```

## 配置选项

```typescript
interface RequirementsClarificationAgentOptions {
  model?: AvailableModelNames;        // 使用的AI模型
  temperature?: number;               // 温度参数
  conversationId?: string;            // 对话ID
}
```

## 状态管理

Agent维护以下对话状态：

- **new**: 新对话，尚未开始澄清
- **clarifying**: 正在澄清需求，需要更多信息
- **confirmed**: 需求已确认，准备生成文档
- **parsing**: 正在生成结构化文档
- **completed**: 需求澄清和文档生成完成

## 错误处理

Agent具有完善的错误处理机制：

1. **API调用错误**: 捕获AI模型调用异常，返回友好的错误信息
2. **JSON解析错误**: 处理AI返回的JSON格式错误
3. **状态管理错误**: 确保对话状态的一致性
4. **网络错误**: 处理网络连接问题

## 最佳实践

1. **清晰的初始需求**: 提供尽可能详细的初始需求描述
2. **积极回应澄清**: 及时回答澄清问题，提供具体信息
3. **明确确认**: 使用明确的确认语言（如"确认"、"是的"等）
4. **上下文维护**: 在相关对话中保持上下文连贯性
5. **领域信息**: 提供业务领域信息，帮助Agent更好地理解需求

## 集成指南

### 与前端集成

```typescript
// 前端调用示例
const response = await $fetch('/api/requirements/clarification', {
  method: 'POST',
  body: {
    message: userInput,
    conversationId: currentConversationId,
    context: {
      domain: currentDomain
    }
  }
});
```

### 与其他Agent集成

```typescript
// 需求确认后自动调用建模Agent
const modelingAgent = new RequirementsModelingAgent({
  model: this.model,
  includeConfidenceAnalysis: true
});

const modelingResult = await modelingAgent.model(fullRequirements);
```

## 技术实现

### AI模型使用
- 使用DeepSeek、Qwen等大语言模型进行需求分析
- 通过temperature参数控制输出的创造性
- 使用system prompt定义Agent的角色和行为

### 自然语言处理
- 确认检测使用专门的NLP提示词
- 需求分析使用结构化的JSON输出
- 支持多轮对话的上下文维护

### 数据持久化
- 对话上下文存储在内存中
- 支持会话恢复和状态保持
- 可扩展为数据库持久化

## 性能优化

1. **上下文管理**: 智能截断过长的对话历史
2. **并行处理**: 异步处理AI模型调用
3. **缓存机制**: 缓存常见问题和回答模式
4. **错误恢复**: 快速从错误中恢复，保持用户体验

## 扩展性

Agent设计支持以下扩展：

1. **多语言支持**: 可扩展支持不同语言的需求澄清
2. **领域专业化**: 可针对特定业务领域进行优化
3. **自定义提示词**: 支持自定义系统提示词
4. **插件系统**: 支持添加第三方澄清规则

## 维护和更新

- 定期更新AI模型以获得更好的性能
- 根据用户反馈优化澄清问题生成
- 添加新的业务领域支持
- 改进错误处理和用户体验