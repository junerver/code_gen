/**
 * 会话相关类型定义
 */
export interface Conversation {
  /** 会话唯一标识 */
  id: string;
  /** 会话标题 */
  title: string;
  /** 会话分组 */
  group?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最后一条消息内容 */
  lastMessage?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 会话配置 */
  config?: ConversationConfig;
}

/**
 * 会话配置
 */
export interface ConversationConfig {
  /** AI模型 */
  model?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
}

/**
 * 会话创建参数
 */
export interface CreateConversationParams {
  /** 会话标题 */
  title?: string;
  /** 会话分组 */
  group?: string;
  /** 会话配置 */
  config?: ConversationConfig;
}

/**
 * 会话更新参数
 */
export interface UpdateConversationParams {
  /** 会话标题 */
  title?: string;
  /** 会话分组 */
  group?: string;
  /** 会话配置 */
  config?: ConversationConfig;
}

/**
 * 会话存储接口（为未来数据库扩展预留）
 */
export interface ConversationStorage {
  /** 获取所有会话 */
  getConversations(): Promise<Conversation[]>;
  /** 根据ID获取会话 */
  getConversation(id: string): Promise<Conversation | null>;
  /** 创建会话 */
  createConversation(params: CreateConversationParams): Promise<Conversation>;
  /** 更新会话 */
  updateConversation(
    id: string,
    params: UpdateConversationParams
  ): Promise<Conversation>;
  /** 删除会话 */
  deleteConversation(id: string): Promise<void>;
}
