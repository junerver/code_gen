/**
 * @Description 会话ID到模板上下文的映射存储
 * @Author 侯文君
 * @Date 2025-09-17 15:00
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-17 15:04
 */

interface TemplateContext {
  table_name: string;
  structuredContent: any;
  timestamp: number;
}

class TemplateContextStorage {
  private contextMap: Map<string, TemplateContext> = new Map();

  /**
   * 添加或更新会话的模板上下文
   */
  setContext(
    conversationId: string,
    tableName: string,
    structuredContent: any
  ): void {
    this.contextMap.set(conversationId, {
      table_name: tableName,
      structuredContent: structuredContent,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取会话的模板上下文
   */
  getContext(conversationId: string): TemplateContext | undefined {
    return this.contextMap.get(conversationId);
  }

  /**
   * 检查是否存在会话的模板上下文
   */
  hasContext(conversationId: string): boolean {
    return this.contextMap.has(conversationId);
  }

  /**
   * 删除会话的模板上下文
   */
  deleteContext(conversationId: string): boolean {
    return this.contextMap.delete(conversationId);
  }

  /**
   * 清空所有模板上下文
   */
  clearAll(): void {
    this.contextMap.clear();
  }

  /**
   * 获取所有会话ID
   */
  getAllConversationIds(): string[] {
    return Array.from(this.contextMap.keys());
  }

  /**
   * 获取存储大小
   */
  get size(): number {
    return this.contextMap.size;
  }
}

// 单例实例
export const templateContextStorage = new TemplateContextStorage();
