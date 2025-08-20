import { ref, readonly, computed } from "vue";
import type { ChatMessage } from "~/types/chat";
import { useConversationStore } from "~/stores/conversation";

/**
 * 聊天功能组合式函数
 * @returns 聊天相关的状态和方法
 */
export const useChat = () => {
	const conversationStore = useConversationStore();
	const loading = ref(false);
	const error = ref<string | undefined>();

	// 从store获取当前会话的消息
	const messages = computed(() => conversationStore.activeMessages);
	const activeConversation = computed(
		() => conversationStore.activeConversation,
	);

	/**
	 * 生成消息ID
	 * @returns 唯一的消息ID
	 */
	const generateMessageId = (): string => {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	};

	/**
	 * 添加用户消息到当前会话
	 * @param content 消息内容
	 */
	const addUserMessage = (content: string): void => {
		if (!conversationStore.activeConversationId) {
			conversationStore.initializeDefaultConversation();
		}

		// 检查是否为该会话的第一条消息
		const currentMessages = conversationStore.getMessages(
			conversationStore.activeConversationId,
		);
		const isFirstMessage = currentMessages.length === 0;

		const message: ChatMessage = {
			id: generateMessageId(),
			content,
			role: "user",
			timestamp: new Date(),
		};
		conversationStore.addMessage(
			conversationStore.activeConversationId,
			message,
		);

		// 如果是第一条消息，更新会话标题
		if (isFirstMessage) {
			// 截取前30个字符作为标题，避免标题过长
			const title =
				content.length > 30 ? content.slice(0, 30) + "..." : content;
			conversationStore.updateConversation(
				conversationStore.activeConversationId,
				{ title },
			);
		}
	};

	/**
	 * 添加助手消息到当前会话
	 * @param content 消息内容
	 */
	const addAssistantMessage = (content: string): void => {
		if (!conversationStore.activeConversationId) {
			conversationStore.initializeDefaultConversation();
		}

		const message: ChatMessage = {
			id: generateMessageId(),
			content,
			role: "assistant",
			timestamp: new Date(),
		};
		conversationStore.addMessage(
			conversationStore.activeConversationId,
			message,
		);
	};

	/**
	 * 更新当前会话中的助手消息内容
	 * @param messageId 消息ID
	 * @param content 新的消息内容
	 */
	const updateAssistantMessage = (messageId: string, content: string): void => {
		if (conversationStore.activeConversationId) {
			conversationStore.updateMessage(
				conversationStore.activeConversationId,
				messageId,
				content,
			);
		}
	};

	/**
	 * 生成AI回复的核心逻辑
	 * @param assistantMessageId 助手消息ID
	 * @returns 生成的回复内容
	 */
	const generateResponse = async (
		assistantMessageId: string,
	): Promise<string> => {
		// 调用流式API
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: messages.value.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("无法获取响应流");
		}

		const decoder = new TextDecoder();
		let accumulatedContent = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.startsWith("data: ") && !line.includes("[DONE]")) {
					try {
						const jsonStr = line.slice(6); // 移除 'data: ' 前缀
						const data = JSON.parse(jsonStr);

						// 处理ollama的text-delta类型数据
						if (data.type === "text-delta" && data.delta) {
							accumulatedContent += data.delta;
							updateAssistantMessage(assistantMessageId, accumulatedContent);
						}
					} catch (parseError) {
						console.warn("解析流数据失败:", parseError, "原始行:", line);
					}
				}
			}
		}

		// 流式响应完成，确保typing状态被设置为false
		if (conversationStore.activeConversationId) {
			conversationStore.updateMessage(
				conversationStore.activeConversationId,
				assistantMessageId,
				accumulatedContent,
			);
		}

		return accumulatedContent;
	};

	/**
	 * 发送消息
	 * @param content 消息内容
	 */
	const sendMessage = async (content: string): Promise<void> => {
		if (!content.trim()) return;

		loading.value = true;
		error.value = undefined;

		try {
			// 添加用户消息
			addUserMessage(content);

			// 创建助手消息占位符
			const assistantMessageId = generateMessageId();
			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				content: "",
				role: "assistant",
				timestamp: new Date(),
				loading: true,
				typing: { step: 5, interval: 35 },
			};
			messages.value.push(assistantMessage);

			// 生成回复
			await generateResponse(assistantMessageId);
		} catch (err) {
			error.value = err instanceof Error ? err.message : "发送消息失败";
			console.error("发送消息失败:", err);

			// 如果出错，处理助手消息状态
			if (conversationStore.activeConversationId) {
				const currentMessages = conversationStore.getMessages(
					conversationStore.activeConversationId,
				);
				const lastMessage = currentMessages[currentMessages.length - 1];
				if (currentMessages.length > 0 && lastMessage?.role === "assistant") {
					if (lastMessage.content === "") {
						// 如果消息为空，删除消息
						conversationStore.deleteMessage(
							conversationStore.activeConversationId,
							lastMessage.id,
						);
					} else {
						// 如果消息有内容，确保typing和loading状态为false
						conversationStore.updateMessage(
							conversationStore.activeConversationId,
							lastMessage.id,
							lastMessage.content,
						);
					}
				}
			}
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 重新生成指定消息及其之后的回复
	 * @param messageId 要重新生成的消息ID
	 */
	const regenerate = async (messageId: string): Promise<void> => {
		if (!conversationStore.activeConversationId) return;

		loading.value = true;
		error.value = undefined;

		try {
			// 获取当前会话的所有消息
			const currentMessages = conversationStore.getMessages(
				conversationStore.activeConversationId,
			);

			// 找到指定消息的索引
			const messageIndex = currentMessages.findIndex(
				(msg) => msg.id === messageId,
			);
			if (messageIndex === -1) {
				throw new Error("未找到指定的消息");
			}

			// 删除指定消息及其之后的所有消息
			const messagesToDelete = currentMessages.slice(messageIndex);
			for (const msg of messagesToDelete) {
				conversationStore.deleteMessage(
					conversationStore.activeConversationId,
					msg.id,
				);
			}

			// 创建新的助手消息占位符
			const assistantMessageId = generateMessageId();
			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				content: "",
				role: "assistant",
				timestamp: new Date(),
				loading: true,
				typing: true,
			};
			conversationStore.addMessage(
				conversationStore.activeConversationId,
				assistantMessage,
			);

			// 生成新的回复
			await generateResponse(assistantMessageId);
		} catch (err) {
			error.value = err instanceof Error ? err.message : "重新生成失败";
			console.error("重新生成失败:", err);

			// 如果出错，处理助手消息状态
			if (conversationStore.activeConversationId) {
				const currentMessages = conversationStore.getMessages(
					conversationStore.activeConversationId,
				);
				const lastMessage = currentMessages[currentMessages.length - 1];
				if (currentMessages.length > 0 && lastMessage?.role === "assistant") {
					if (lastMessage.content === "") {
						// 如果消息为空，删除消息
						conversationStore.deleteMessage(
							conversationStore.activeConversationId,
							lastMessage.id,
						);
					} else {
						// 如果消息有内容，确保typing和loading状态为false
						conversationStore.updateMessage(
							conversationStore.activeConversationId,
							lastMessage.id,
							lastMessage.content,
						);
					}
				}
			}
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 清空当前会话的聊天记录
	 */
	const clearMessages = (): void => {
		if (conversationStore.activeConversationId) {
			conversationStore.clearMessages(conversationStore.activeConversationId);
		}
		error.value = undefined;
	};

	/**
	 * 删除当前会话中的指定消息
	 * @param messageId 消息ID
	 */
	const deleteMessage = (messageId: string): void => {
		if (conversationStore.activeConversationId) {
			conversationStore.deleteMessage(
				conversationStore.activeConversationId,
				messageId,
			);
		}
	};

	return {
		// 只读状态
		messages,
		activeConversation,
		loading: readonly(loading),
		error: readonly(error),

		// 会话store引用
		conversationStore,

		// 方法
		sendMessage,
		regenerate,
		clearMessages,
		deleteMessage,
		addUserMessage,
		addAssistantMessage,
		updateAssistantMessage,
	};
};
