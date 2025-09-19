/**
 * @Description mcp-tools.ts
 * @Author 侯文君
 * @Date 2025-09-02 8:52
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-19 10:29
 */

import { experimental_createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import z from 'zod';

const MCP_SERVER_DIRECTORY = useRuntimeConfig().mcpServerDirectory;

/**
 * 模板工具
 */
const templateClientPromise = experimental_createMCPClient({
  transport: new StdioClientTransport({
    command: 'uv',
    args: ['--directory', MCP_SERVER_DIRECTORY, 'run', 'template_mcp'],
  }),
});

/**
 * MySQL 工具，其中包含很多mysql通用工具，需要屏蔽
 */
const mysqlClientPromise = experimental_createMCPClient({
  transport: new StdioClientTransport({
    command: 'uv',
    args: ['--directory', MCP_SERVER_DIRECTORY, 'run', 'mysql_mcp'],
    env: {
      MYSQL_HOST: '192.168.187.188',
      MYSQL_PORT: '3306',
      MYSQL_USER: 'research',
      MYSQL_PASSWORD: 'JrkxS@rsh2024.',
      MYSQL_DATABASE: 'jkr_framework',
    },
  }),
});

/**
 * 初始化用于代码生成的模板工具：模板上下文工具、模板内容工具
 */
export const initTemplateTools = async () => {
  // 只暴露模板工具，并明确约束输入参数协议
  const templateTools = await (
    await templateClientPromise
  ).tools({
    schemas: {
      get_template_content: {
        inputSchema: z.object({
          template_name: z
            .enum([
              'domain',
              'mapper',
              'service',
              'serviceImpl',
              'controller',
              'mapper_xml',
              'sub_domain',
              'api',
              'vue_index',
              'vue_form',
              'vue_tree',
              'vue_v3_index',
              'vue_v3_tree',
              'sql',
            ])
            .describe('Name of the template to get template content'),
        }),
      },
    },
  });
  // 只暴露模板上下文工具
  const mysqlTools = await (
    await mysqlClientPromise
  ).tools({
    schemas: {
      prepare_template_context: {
        inputSchema: z.object({
          table_name: z
            .string()
            .describe('Name of the table to prepare template context'),
        }),
      },
    },
  });
  return {
    ...templateTools,
    ...mysqlTools,
  };
};
