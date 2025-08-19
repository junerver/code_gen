/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */

import { ollama } from "ollama-ai-provider-v2";
// 合并导入以避免重复导入
import { streamText } from "ai";

export default defineLazyEventHandler(async () => {
	return defineEventHandler(async (event: any) => {
		const { messages } = await readBody(event);
		const result = streamText({
			model: ollama("qwen2.5:7b"),
			messages,
		});

		return result.toUIMessageStreamResponse();
	});
});
