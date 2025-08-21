/**
 * @Description 用于提取代码的工具函数
 * @Author 侯文君
 * @Date 2025-08-20 16:45
 * @LastEditors 侯文君
 * @LastEditTime 2025-08-21 19:37
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
		return "";
	}

	// 提取指定索引的代码块中的实际代码内容
	const codeBlock = matches[index];
	// 移除开头的 ```language 或 ``` 和结尾的 ```
	// 添加类型检查，确保codeBlock不为undefined
	const code = (codeBlock || "")
		.replace(/^```(?:\w+)?\s*/, "") // 移除开头的```和可选的语言标识
		.replace(/\s*```$/, ""); // 移除结尾的```

	return code.trim();
};

/**
 * 创建可预览的代码
 * @param code 原始代码
 * @param elementPlusVersion Element Plus 版本号，默认值为 "2.10.7"
 * @returns 可预览的代码字符串
 */
export const genPreviewCode = (code: string) => {
	const { template, script, style } = extractVuePart(code);

	// 检查脚本中是否已经包含 Element Plus 的导入和初始化
	const hasElementPlusImport =
		script.includes('from "element-plus"') ||
		script.includes("from 'element-plus'");
	const hasSetupElementPlus = script.includes("setupElementPlus");

	// 如果没有 Element Plus 相关的导入，则添加
	let enhancedScript = script;
	if (!hasElementPlusImport && !hasSetupElementPlus) {
		enhancedScript = `import { setupElementPlus } from './element-plus.js'

${script}

// 初始化 Element Plus
setupElementPlus()`;
	}

	return `<template>
${template}
</template>

<script setup>
${enhancedScript}
</script>

<style scoped>
${style}
</style>`;
};

/**
 * 从代码中提取 Vue 相关的部分（template、script、style）
 * @param code 包含 Vue 组件代码的字符串
 * @returns 包含提取到的 template、script、style 代码的对象
 */
export const extractVuePart = (code: string) => {
	const templateRegex = /<template>([\s\S]*?)<\/template>/;
	const scriptRegex = /<script setup>([\s\S]*?)<\/script>/;
	const styleRegex = /<style scoped>([\s\S]*?)<\/style>/;

	const templateMatch = code.match(templateRegex);
	const scriptMatch = code.match(scriptRegex);
	const styleMatch = code.match(styleRegex);

	const template =
		templateMatch && templateMatch[1] ? templateMatch[1].trim() : "";
	const script = scriptMatch && scriptMatch[1] ? scriptMatch[1].trim() : "";
	const style = styleMatch && styleMatch[1] ? styleMatch[1].trim() : "";

	return {
		template,
		script,
		style,
	};
};
