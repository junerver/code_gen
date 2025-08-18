/**
 * 聊天消息接口
 */
export interface ChatMessage {
  id: string
  // 消息内容
  content: string
  // 消息的角色
  role: 'user' | 'assistant'
  timestamp: Date
  avatar?: string;

}
