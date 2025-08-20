/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */

import { ollama } from "ollama-ai-provider-v2";
import { streamText } from "ai";

export default defineLazyEventHandler(async () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return defineEventHandler(async (event: any) => {
		const { messages } = await readBody(event);
		const result = streamText({
			model: ollama("qwen2.5:7b"),
			system: `
			你是一个专业的代码生成助手，你需要根据用户的需求生成代码。
			用户的需求：${messages[messages.length - 1].content}
			请生成代码并返回。
			前端代码使用的技术栈为 vue3 + js + element-plus，遵循最佳实践，使用组合式api
			代码需要包含必要的注释，方便其他开发人员理解和维护。
			代码需要包含必要的错误处理，避免程序崩溃。
			代码需要包含必要的性能优化，避免页面卡顿。
			代码需要包含必要的代码规范，符合eslint规范。
			代码需要包含必要的代码注释，符合jsdoc规范。
			你应该深度理解用户的需求，并根据用户的需求生成代码。
			`,
			messages,
		});

		return result.toUIMessageStreamResponse();
	});
});
