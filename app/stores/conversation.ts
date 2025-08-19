import { defineStore } from "pinia";
import type { ChatMessage } from "~/types/chat";
import type {
	Conversation,
	CreateConversationParams,
	UpdateConversationParams,
} from "~/types/conversation";

/**
 * 会话状态管理
 */
export const useConversationStore = defineStore("conversation", () => {
	// 状态
	const conversations = ref<Conversation[]>([]);
	const activeConversationId = ref<string>("");
	const conversationMessages = ref<Map<string, ChatMessage[]>>(new Map());
	const loading = ref(false);
	const error = ref<string | undefined>();

	// 计算属性
	const activeConversation = computed(() => {
		return conversations.value.find(
			(conv) => conv.id === activeConversationId.value,
		);
	});

	const activeMessages = computed(() => {
		return conversationMessages.value.get(activeConversationId.value) || [];
	});

	const conversationCount = computed(() => conversations.value.length);

	/**
	 * 生成会话ID
	 * @returns 唯一的会话ID
	 */
	const generateConversationId = (): string => {
		return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	};

	/**
	 * 创建新会话
	 * @param params 创建参数
	 * @returns 新创建的会话
	 */
	const createConversation = (
		params: CreateConversationParams = {},
	): Conversation => {
		const now = new Date();
		const conversation: Conversation = {
			id: generateConversationId(),
			title: params.title || `新对话 ${conversations.value.length + 1}`,
			group: params.group || "recent",
			createdAt: now,
			updatedAt: now,
			config: params.config,
		};

		conversations.value.unshift(conversation);
		conversationMessages.value.set(conversation.id, []);
		activeConversationId.value = conversation.id;

		return conversation;
	};

	/**
	 * 更新会话
	 * @param id 会话ID
	 * @param params 更新参数
	 */
	const updateConversation = (
		id: string,
		params: UpdateConversationParams,
	): void => {
		const index = conversations.value.findIndex((conv) => conv.id === id);
		if (index > -1) {
			const conversation = conversations.value[index];
			if (conversation) {
				Object.assign(conversation, {
					...params,
					updatedAt: new Date(),
				});
			}
		}
	};

	/**
	 * 删除会话
	 * @param id 会话ID
	 */
	const deleteConversation = (id: string): void => {
		const index = conversations.value.findIndex((conv) => conv.id === id);
		if (index > -1) {
			conversations.value.splice(index, 1);
			conversationMessages.value.delete(id);

			// 如果删除的是当前活跃会话，切换到第一个会话
			if (activeConversationId.value === id) {
				if (conversations.value.length > 0) {
					activeConversationId.value = conversations.value[0]?.id || "";
				} else {
					activeConversationId.value = "";
				}
			}
		}
	};

	/**
	 * 切换活跃会话
	 * @param id 会话ID
	 */
	const setActiveConversation = (id: string): void => {
		const conversation = conversations.value.find((conv) => conv.id === id);
		if (conversation) {
			activeConversationId.value = id;
		}
	};

	/**
	 * 添加消息到指定会话
	 * @param conversationId 会话ID
	 * @param message 消息
	 */
	const addMessage = (conversationId: string, message: ChatMessage): void => {
		const messages = conversationMessages.value.get(conversationId) || [];
		messages.push(message);
		conversationMessages.value.set(conversationId, messages);

		// 更新会话的最后消息和更新时间
		const conversation = conversations.value.find(
			(conv) => conv.id === conversationId,
		);
		if (conversation) {
			conversation.lastMessage =
				message.content.slice(0, 50) +
				(message.content.length > 50 ? "..." : "");
			conversation.updatedAt = new Date();
		}
	};

	/**
	 * 更新指定会话中的消息
	 * @param conversationId 会话ID
	 * @param messageId 消息ID
	 * @param content 新内容
	 */
	const updateMessage = (
		conversationId: string,
		messageId: string,
		content: string,
	): void => {
		const messages = conversationMessages.value.get(conversationId) || [];
		const messageIndex = messages.findIndex((msg) => msg.id === messageId);
		if (messageIndex > -1) {
			const message = messages[messageIndex];
			if (message) {
				message.content = content;
				if (message.loading) {
					message.loading = false;
				}
			}
		}
	};

	/**
	 * 删除指定会话中的消息
	 * @param conversationId 会话ID
	 * @param messageId 消息ID
	 */
	const deleteMessage = (conversationId: string, messageId: string): void => {
		const messages = conversationMessages.value.get(conversationId) || [];
		const messageIndex = messages.findIndex((msg) => msg.id === messageId);
		if (messageIndex > -1) {
			messages.splice(messageIndex, 1);
		}
	};

	/**
	 * 清空指定会话的消息
	 * @param conversationId 会话ID
	 */
	const clearMessages = (conversationId: string): void => {
		conversationMessages.value.set(conversationId, []);

		// 更新会话信息
		const conversation = conversations.value.find(
			(conv) => conv.id === conversationId,
		);
		if (conversation) {
			conversation.lastMessage = undefined;
			conversation.updatedAt = new Date();
		}
	};

	/**
	 * 获取指定会话的消息
	 * @param conversationId 会话ID
	 * @returns 消息列表
	 */
	const getMessages = (conversationId: string): ChatMessage[] => {
		return conversationMessages.value.get(conversationId) || [];
	};

	/**
	 * 初始化默认会话
	 */
	const initializeDefaultConversation = (): void => {
		if (conversations.value.length === 0) {
			createConversation({
				title: "新对话",
				group: "recent",
			});
		}
	};

	/**
	 * 重置所有状态
	 */
	const reset = (): void => {
		conversations.value = [];
		activeConversationId.value = "";
		conversationMessages.value.clear();
		error.value = undefined;
	};

	return {
		// 状态
		conversations: readonly(conversations),
		activeConversationId: readonly(activeConversationId),
		activeConversation,
		activeMessages,
		conversationCount,
		loading: readonly(loading),
		error: readonly(error),

		// 方法
		createConversation,
		updateConversation,
		deleteConversation,
		setActiveConversation,
		addMessage,
		updateMessage,
		deleteMessage,
		clearMessages,
		getMessages,
		initializeDefaultConversation,
		reset,
	};
});
