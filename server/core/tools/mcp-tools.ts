/**
 * @Description mcp-tools.ts
 * @Author 侯文君
 * @Date 2025-09-02 8:52
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-02 09:11
 */

import { experimental_createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * 模板工具
 */
const templateClientPromise = experimental_createMCPClient({
  transport: new StdioClientTransport({
    command: 'uv',
    args: [
      '--directory',
      'E:/GitHub/All_in_Ai/test_mcp_server',
      'run',
      'template_mcp',
    ],
  }),
});

export const initMcpTools = async () => {
  const templateTools = await (await templateClientPromise).tools();
  return {
    ...templateTools,
  };
};
