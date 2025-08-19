import { ref, readonly } from "vue";
import type { ChatMessage } from "~/types/chat";

/**
 * 聊天功能组合式函数
 * @returns 聊天相关的状态和方法
 */
export const useChat = () => {
	const messages = ref<ChatMessage[]>([]);
	const loading = ref(false);
	const error = ref<string | undefined>();

	/**
	 * 生成消息ID
	 * @returns 唯一的消息ID
	 */
	const generateMessageId = (): string => {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	};

	/**
	 * 添加用户消息
	 * @param content 消息内容
	 */
	const addUserMessage = (content: string): void => {
		const message: ChatMessage = {
			id: generateMessageId(),
			content,
			role: "user",
			timestamp: new Date(),
		};
		messages.value.push(message);
	};

	/**
	 * 添加助手消息
	 * @param content 消息内容
	 */
	const addAssistantMessage = (content: string): void => {
		const message: ChatMessage = {
			id: generateMessageId(),
			content,
			role: "assistant",
			timestamp: new Date(),
		};
		messages.value.push(message);
	};

	/**
	 * 更新助手消息内容
	 * @param messageId 消息ID
	 * @param content 新的消息内容
	 */
	const updateAssistantMessage = (messageId: string, content: string): void => {
		const messageIndex = messages.value.findIndex(
			(msg) => msg.id === messageId,
		);
		if (messageIndex > -1) {
			if (messages.value[messageIndex]) {
				messages.value[messageIndex].content = content;
			}
		}
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
			};
			messages.value.push(assistantMessage);

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
		} catch (err) {
			error.value = err instanceof Error ? err.message : "发送消息失败";
			console.error("发送消息失败:", err);

			// 如果出错，移除最后添加的空助手消息
			const lastMessage = messages.value[messages.value.length - 1];
			if (
				messages.value.length > 0 &&
				lastMessage?.role === "assistant" &&
				lastMessage?.content === ""
			) {
				messages.value.pop();
			}
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 清空聊天记录
	 */
	const clearMessages = (): void => {
		messages.value = [];
		error.value = undefined;
	};

	/**
	 * 删除指定消息
	 * @param messageId 消息ID
	 */
	const deleteMessage = (messageId: string): void => {
		const index = messages.value.findIndex((msg) => msg.id === messageId);
		if (index > -1) {
			messages.value.splice(index, 1);
		}
	};

	return {
		// 只读状态
		messages: readonly(messages),
		loading: readonly(loading),
		error: readonly(error),

		// 方法
		sendMessage,
		clearMessages,
		deleteMessage,
		addUserMessage,
		addAssistantMessage,
		updateAssistantMessage,
	};
};
