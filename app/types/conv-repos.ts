import type { ChatMessage } from './chat';
import type {
  Conversation,
  CreateConversationParams,
  UpdateConversationParams,
} from './conversation';

/**
 * 会话存储仓库接口
 * 抽象存储层，支持多种存储实现
 */
export interface IConversationRepository {
  // ===== 状态访问 =====
  /** 获取所有会话 */
  readonly conversations: readonly Conversation[];
  /** 获取当前活跃会话ID */
  readonly activeConversationId: string;
  /** 获取当前活跃会话 */
  readonly activeConversation: Conversation | undefined;
  /** 获取当前活跃会话的消息列表 */
  readonly activeMessages: ChatMessage[];
  /** 获取会话数量 */
  readonly conversationCount: number;

  // ===== 会话管理 =====
  /**
   * 创建新会话
   * @param params 创建参数
   * @returns 新创建的会话
   */
  createConversation(params?: CreateConversationParams): Conversation;

  /**
   * 更新会话信息
   * @param id 会话ID
   * @param params 更新参数
   */
  updateConversation(id: string, params: UpdateConversationParams): void;

  /**
   * 删除会话
   * @param id 会话ID
   */
  deleteConversation(id: string): void;

  /**
   * 设置活跃会话
   * @param id 会话ID
   */
  setActiveConversation(id: string): void;

  /**
   * 初始化默认会话
   */
  initializeDefaultConversation(): void;

  /**
   * 检查最新创建的会话是否为空
   * @returns 如果最新会话没有消息返回true
   */
  isLatestConversationEmpty(): boolean;

  /**
   * 切换到最新创建的会话
   */
  switchToLatestConversation(): void;

  // ===== 消息管理 =====
  /**
   * 添加消息到指定会话
   * @param conversationId 会话ID
   * @param message 消息对象
   */
  addMessage(conversationId: string, message: ChatMessage): void;

  /**
   * 更新指定会话中的消息
   * @param conversationId 会话ID
   * @param messageId 消息ID
   * @param content 新内容
   * @param done 是否完成
   */
  updateMessage(
    conversationId: string,
    messageId: string,
    content: string,
    done?: boolean
  ): void;

  /**
   * 更新指定会话中的消息推理内容
   * @param conversationId 会话ID
   * @param messageId 消息ID
   * @param reasoningContent 推理内容
   * @param reasoningStatus 推理状态
   */
  updateMessageReasoning(
    conversationId: string,
    messageId: string,
    reasoningContent: string,
    reasoningStatus?: ChatMessage['reasoningStatus']
  ): void;

  /**
   * 删除指定会话中的消息
   * @param conversationId 会话ID
   * @param messageId 消息ID
   */
  deleteMessage(conversationId: string, messageId: string): void;

  /**
   * 清空指定会话的所有消息
   * @param conversationId 会话ID
   */
  clearMessages(conversationId: string): void;

  /**
   * 获取指定会话的消息列表
   * @param conversationId 会话ID
   * @returns 消息列表
   */
  getMessages(conversationId: string): ChatMessage[];

  // ===== 状态重置 =====
  /**
   * 重置所有状态
   */
  reset(): void;
}
