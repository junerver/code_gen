import type { AvailableModelNames } from '#shared/types/model';
import type { ModelMessage } from 'ai';

/**
 * @Description chat.ts
 * @Author 侯文君
 * @Date 2025-09-03 14:07
 * @LastEditors 侯文君
 * @LastEditTime 2025-09-03 18:39
 */

export interface ChatRequest {
  model: AvailableModelNames;
  messages: ModelMessage[];
  temperature?: number;
}
