/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */

export default defineEventHandler((event) => {
	return new Promise<string>((resolve, reject) => {
		setTimeout(() => {
			resolve("Test post handler");
		}, 1000);
	});
});
