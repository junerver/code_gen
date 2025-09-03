import type { AvailableModelNames } from '#shared/types/model';

/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-09-03 14:07
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-03 14:12
 */

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: AvailableModelNames;
  messages: ModelMessage[];
  temperature?: number;
}
