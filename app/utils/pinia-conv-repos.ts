import type { IConversationRepository } from '~/types/conv-repos';
import type { ChatMessage } from '~/types/chat';
import type {
  Conversation,
  CreateConversationParams,
  UpdateConversationParams,
} from '~/types/conversation';

/**
 * Pinia Store 适配器
 * 将 useConversationStore 适配为 IConversationRepository 接口
 */
export class PiniaConversationRepository implements IConversationRepository {
  private store: ReturnType<typeof useConversationStore>;

  constructor(store?: ReturnType<typeof useConversationStore>) {
    this.store = store || useConversationStore();
  }

  // ===== 状态访问 =====
  get conversations(): readonly Conversation[] {
    return this.store.conversations;
  }

  get activeConversationId(): string {
    return this.store.activeConversationId;
  }

  get activeConversation(): Conversation | undefined {
    return this.store.activeConversation;
  }

  get activeMessages(): ChatMessage[] {
    return this.store.activeMessages;
  }

  get conversationCount(): number {
    return this.store.conversationCount;
  }

  // ===== 会话管理 =====
  createConversation(params?: CreateConversationParams): Conversation {
    return this.store.createConversation(params);
  }

  updateConversation(id: string, params: UpdateConversationParams): void {
    this.store.updateConversation(id, params);
  }

  deleteConversation(id: string): void {
    this.store.deleteConversation(id);
  }

  setActiveConversation(id: string): void {
    this.store.setActiveConversation(id);
  }

  initializeDefaultConversation(): void {
    this.store.initializeDefaultConversation();
  }

  isLatestConversationEmpty(): boolean {
    return this.store.isLatestConversationEmpty();
  }

  switchToLatestConversation(): void {
    this.store.switchToLatestConversation();
  }

  // ===== 消息管理 =====
  addMessage(conversationId: string, message: ChatMessage): void {
    this.store.addMessage(conversationId, message);
  }

  updateMessage(
    conversationId: string,
    messageId: string,
    content: string,
    done?: boolean
  ): void {
    this.store.updateMessage(conversationId, messageId, content, done);
  }

  updateMessageReasoning(
    conversationId: string,
    messageId: string,
    reasoningContent: string,
    reasoningStatus?: ChatMessage['reasoningStatus']
  ): void {
    this.store.updateMessageReasoning(
      conversationId,
      messageId,
      reasoningContent,
      reasoningStatus
    );
  }

  deleteMessage(conversationId: string, messageId: string): void {
    this.store.deleteMessage(conversationId, messageId);
  }

  clearMessages(conversationId: string): void {
    this.store.clearMessages(conversationId);
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.store.getMessages(conversationId);
  }

  // ===== 状态重置 =====
  reset(): void {
    this.store.reset();
  }
}
