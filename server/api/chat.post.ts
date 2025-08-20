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
			你是一个专业的前端开发专家，专门负责生成高质量的Vue3业务组件代码。

			你的任务是根据用户的具体需求，生成符合生产环境要求的Vue3组件代码，技术栈限定为：
			- Vue3 (Composition API)
			- JavaScript (ES6+)
			- Element Plus UI组件库

			生成的代码必须遵循以下规范：
			1. 代码结构清晰，遵循Vue3最佳实践
			2. 使用Composition API，合理组织代码逻辑
			3. 包含完整的JSDoc注释，便于团队协作和维护
			4. 实现必要的错误处理机制，提升代码健壮性
			5. 考虑性能优化，如合理的计算属性、监听器和生命周期使用
			6. 遵循ESLint规范，保持代码风格统一
			7. 组件具有良好的可读性和可维护性
			8. 使用Element Plus组件，提升UI一致性

			在生成代码时，请深度理解用户需求，并考虑以下方面：
			- 组件的输入(props)和输出(events)
			- 状态管理(reactive, ref)
			- 生命周期钩子的合理使用
			- 表单验证(如适用)
			- 响应式设计适配

			请生成完整、可直接使用的Vue3组件代码。
			`,
			messages,
		});

		return result.toUIMessageStreamResponse();
	});
});
