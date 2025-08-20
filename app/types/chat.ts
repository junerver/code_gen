import type { BubbleProps } from "vue-element-plus-x/types/Bubble";

/**
 * 气泡聊天消息的数据类型
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */
export type ChatMessage = BubbleProps & {
	id: string;
	// 消息内容
	content: string;
	// 消息的角色
	role: "user" | "assistant" | "system";
	timestamp: Date;
};
