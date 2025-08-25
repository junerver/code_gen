/**
 * @Description id.ts
 * @Author 侯文君
 * @Date 2025-08-26 11:27
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-26 11:30
 */

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成消息ID
 * @returns 唯一的消息ID
 */
export const generateMessageId = (): string => {
  return generateId("msg");
};

/**
 * 生成会话ID
 * @returns 唯一的会话ID
 */
export const generateConversationId = (): string => {
  return generateId("conv");
};
