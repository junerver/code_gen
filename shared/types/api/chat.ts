/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-09-03 14:07
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-17 14:15
 */

import type { AvailableModelNames } from '#shared/types/model';
import type { ModelMessage } from 'ai';

export interface ChatRequest {
  conversationId: string;
  model: AvailableModelNames;
  messages: ModelMessage[];
  temperature?: number;
}
