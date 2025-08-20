/**
 * @Description 用于提取代码的工具函数
 * @Author 侯文君
 * @Date 2025-08-20 16:45
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-21 13:14
 */

/**
 * 从文本内容中提取指定语言的代码块
 * @param content 包含代码块的文本内容
 * @param language 可选的语言标识，如果指定则只匹配该语言的代码块
 * @param index 可选的索引，指定提取第几个代码块（从0开始），默认为0
 * @returns 提取到的代码内容，如果没有提取到代码块，则返回原始内容
 */
export const extractCode = (
	content: string,
	language?: string,
	index: number = 0,
): string => {
	// 正则表达式匹配代码块，支持可选的语言标识
	const codeRegex = language
		? new RegExp(`\`\`\`${language}[\\s\\S]*?\`\`\``, "g")
		: /```[\s\S]*?```/g;

	const matches = content.match(codeRegex);
	if (!matches || matches.length <= index) {
		return content;
	}

	// 提取指定索引的代码块中的实际代码内容
	const codeBlock = matches[index];
	// 移除开头的 ```language 或 ``` 和结尾的 ```
	// 添加类型检查，确保codeBlock不为undefined
	const code =
		codeBlock ||
		""
			.replace(/^```(?:\w+)?\s*/, "") // 移除开头的```和可选的语言标识
			.replace(/\s*```$/, ""); // 移除结尾的```

	return code.trim();
};
