/**
 * @Description DynamicHeaderTransport.js
 * @Author 侯文君
 * @Date 2025-11-07 15:17
 * @LastEditors 侯文君
 * @LastEditTime 2025-11-07 15:26
 */

import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export class DynamicHeaderTransport extends SSEClientTransport {
  async _commonHeaders() {
    const headers = await super._commonHeaders();
    headers.set('x-random', Math.random().toString()); // 随机数
    return headers;
  }
}
