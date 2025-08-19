/**
 * 气泡聊天消息的数据类型
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */
export interface ChatMessage {
	id: string;
	// 消息内容
	content: string;
	// 消息的角色
	role: "user" | "assistant" | "system";
	timestamp: Date;
	avatar?: string;
	// 气泡加载状态
	loading?: boolean;
	// 打字机效果状态
	typing?: boolean;
}
