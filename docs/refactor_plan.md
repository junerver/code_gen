# 会话存储迁移重构方案

## 1. 问题分析

### 当前架构问题
- `useChat.ts` 直接依赖 `useConversationStore` Pinia 实现
- 缺乏存储抽象层，难以替换存储方案
- 会话逻辑与存储实现强耦合

### 重构目标
- 解耦会话逻辑与存储实现
- 支持多种存储后端（内存、LocalStorage、数据库等）
- 保持接口稳定性，最小化业务代码修改

## 2. 重构方案

### 2.1 引入存储抽象层

```typescript
// app/composables/storage/IConversationRepository.ts
export interface IConversationRepository {
  // 会话操作
  createConversation(params: CreateConversationParams): Promise<Conversation>;
  updateConversation(id: string, params: UpdateConversationParams): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  getConversation(id: string): Promise<Conversation | undefined>;
  listConversations(): Promise<Conversation[]>;
  
  // 消息操作
  addMessage(conversationId: string, message: ChatMessage): Promise<void>;
  updateMessage(conversationId: string, messageId: string, content: string, done?: boolean): Promise<void>;
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  clearMessages(conversationId: string): Promise<void>;
  
  // 状态管理
  setActiveConversation(id: string): Promise<void>;
  getActiveConversationId(): Promise<string>;
  
  // 事件通知
  onConversationChange(callback: (conversations: Conversation[]) => void): () => void;
  onMessageChange(callback: (conversationId: string, messages: ChatMessage[]) => void): () => void;
}
```

### 2.2 具体存储实现

```typescript
// app/composables/storage/PiniaConversationRepository.ts
export class PiniaConversationRepository implements IConversationRepository {
  private store = useConversationStore();
  
  // 实现所有接口方法
}

// app/composables/storage/LocalStorageConversationRepository.ts
export class LocalStorageConversationRepository implements IConversationRepository {
  // LocalStorage 实现
}

// app/composables/storage/IndexedDBConversationRepository.ts
export class IndexedDBConversationRepository implements IConversationRepository {
  // IndexedDB 实现
}
```

### 2.3 重构 useChat

```typescript
// app/composables/useChat.ts
export const useChat = () => {
  // 通过依赖注入获取存储实现
  const repository = inject<IConversationRepository>('conversationRepository');
  
  // 使用 repository 替代直接调用 store
  const addUserMessage = async (content: string): Promise<void> => {
    const message: ChatMessage = {
      // ... 消息构建
    };
    
    await repository.addMessage(activeConversationId.value, message);
  };
  
  // 其他方法类似重构
};
```

### 2.4 配置存储提供者

```typescript
// app/plugins/storage.client.ts
export default defineNuxtPlugin(() => {
  const app = useNuxtApp();
  
  // 根据配置选择存储实现
  const storageType = useRuntimeConfig().public.storageType || 'pinia';
  
  let repository: IConversationRepository;
  
  switch (storageType) {
    case 'localStorage':
      repository = new LocalStorageConversationRepository();
      break;
    case 'indexedDB':
      repository = new IndexedDBConversationRepository();
      break;
    default:
      repository = new PiniaConversationRepository();
  }
  
  app.provide('conversationRepository', repository);
});
```

## 3. 迁移步骤

### 阶段1：创建抽象层
1. 定义 `IConversationRepository` 接口
2. 创建 `PiniaConversationRepository` 实现
3. 添加依赖注入配置

### 阶段2：重构 useChat
1. 修改 `useChat.ts` 使用 repository 接口
2. 移除直接的 store 依赖
3. 更新错误处理逻辑

### 阶段3：状态管理重构
1. 将 `conversation.ts` 转换为纯数据操作层
2. 添加事件系统支持状态同步
3. 实现响应式状态管理

### 阶段4：添加新存储实现
1. 实现 LocalStorage 存储
2. 实现 IndexedDB 存储
3. 添加数据库存储支持

## 4. 兼容性保证

### 渐进式迁移
- 保持现有 API 不变
- 通过适配器模式确保向后兼容
- 分阶段替换存储实现

### 数据迁移
- 提供数据迁移工具
- 支持多种存储格式转换
- 确保数据一致性

## 5. 测试策略

### 单元测试
- 为每个存储实现编写测试
- 测试接口一致性
- 验证数据持久化

### 集成测试
- 测试存储切换
- 验证数据迁移
- 性能测试

## 6. 配置示例

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      storageType: process.env.STORAGE_TYPE || 'pinia', // 'pinia' | 'localStorage' | 'indexedDB' | 'api'
      storageConfig: {
        localStorage: {
          prefix: 'code_gen_',
          ttl: 7 * 24 * 60 * 60 * 1000 // 7天
        },
        indexedDB: {
          dbName: 'code_gen_conversations',
          version: 1
        },
        api: {
          baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
          timeout: 10000
        }
      }
    }
  }
});
```

## 7. 性能优化

### 懒加载
- 按需加载存储实现
- 延迟初始化大型存储

### 缓存策略
- 内存缓存热门会话
- 异步持久化
- 智能预加载

### 批量操作
- 批量消息更新
- 事务支持
- 乐观更新