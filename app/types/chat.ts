import type { BubbleProps } from 'vue-element-plus-x/types/Bubble';
import type { ModelMessage } from 'ai';

/**
 * 气泡聊天消息的数据类型
 * @Date 2025/8/18 18:49
 * @LastEditors 侯文君
 * @LastEditTime 18:49
 */
export type ChatMessage = BubbleProps &
  ModelMessage & {
    id: string;
    timestamp: Date;
    // 推理内容
    reasoningContent?: string;
    // 推理状态
    reasoningStatus?: 'start' | 'thinking' | 'end' | 'error';
    // 是否正在输入（流式响应状态）
    typing?: boolean;
    // 是否为 Markdown 格式
    isMarkdown?: boolean;
  };
