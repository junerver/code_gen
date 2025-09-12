/**
 * @Description 代码模板相关内容
 * @Author 侯文君
 * @Date 2025-09-11 09:46
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-12 10:03
 */

import type { ModelMessage } from 'ai';

/**
 * 获取代码模板提示词
 * @param isVue3 是否为Vue3项目
 * @returns 代码模板提示词
 */
export const getCodeTemplatePrompt = (isVue3: boolean = true) => {
  return `
# 可用模板列表

## 后端代码

- **domain**: 领域实体类模板
- **mapper**: Mapper接口模板
- **service**: Service接口模板
- **serviceImpl**: Service实现类模板
- **controller**: Controller模板
- **mapper_xml**: MyBatis XML映射文件模板
- **sub_domain**: 子表领域实体类模板

## 前端代码

- **api**: API接口文件模板
${
  isVue3
    ? `- **vue_v3_index**: Vue3页面组件模板
- **vue_v3_tree**: Vue3树形页面组件模板
- **vue_v3_form**: Vue3表单组件模板`
    : `- **vue_index**: Vue2页面组件模板
- **vue_tree**: Vue2树形页面组件模板
- **vue_form**: Vue2表单组件模板`
}

## 数据库脚本

- **sql**: 菜单SQL脚本模板
`;
};

/**
 * 从消息中提取模板名称
 * @param message 模型消息对象
 * @returns 提取到的模板名称，如果未找到则返回空字符串
 */
const extractTemplateNameFromMessage = (message: ModelMessage) => {
  const content = message.content as string;
  const toolCallRegex = /['"]template_name['"]\s*:\s*['"]([^'"]+)['"]/i;
  const match = content.match(toolCallRegex);
  return match ? match[1] : '';
};

/**
 * 从消息中提取文件名
 * @param message 模型消息对象
 * @returns 提取到的文件名
 */
export const getFileNameFromMessage = (message: ModelMessage) => {
  const templateName = extractTemplateNameFromMessage(message);
  console.log('templateName', templateName);
  switch (templateName) {
    case 'domain':
    case 'serviceImpl':
    case 'controller':
    case 'sub_domain':
      return extractJavaFileName(message.content as string);
    case 'mapper':
    case 'service':
      return extractInterfaceFileName(message.content as string);
    case 'mapper_xml':
      return extractMapperXmlFileName(message.content as string);
    case 'api':
      return 'api.js';
    case 'vue_v3_index':
    case 'vue_index':
      return 'Index.vue';
    case 'vue_tree':
    case 'vue_v3_tree':
      return 'Tree.vue';
    case 'vue_form':
    case 'vue_v3_form':
      return 'Form.vue';
    case 'sql':
      return 'sql.sql';
    default:
      return 'source.txt';
  }
};

const extractJavaFileName = (content: string) => {
  const classNameRegex = /class\s+(\w+)/;
  const match = content.match(classNameRegex);
  return match ? match[1] + '.java' : 'source.txt';
};

const extractInterfaceFileName = (content: string) => {
  const classNameRegex = /public\s+interface\s+(\w+)/;
  const match = content.match(classNameRegex);
  return match ? match[1] + '.java' : 'source.txt';
};

const extractMapperXmlFileName = (content: string) => {
  const classNameRegex = /<mapper\s+namespace="[\w.]+\.(\w+Mapper)"/;
  const match = content.match(classNameRegex);
  return match ? match[1] + '.xml' : 'source.txt';
};
