import type { ChatMessage } from '~/types/chat';

export interface AiConversation {
  id: string;
  title: string;
  group?: string;
  disabled?: boolean;
  lastMessage?: string;
  updatedAt?: string | number | Date;
}

export type ConversationMessageMap = Record<string, ChatMessage[]>;

export interface AiChatAdapter {
  loadConversations?: () => Promise<AiConversation[]>;
  loadMessages?: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (payload: {
    conversation: AiConversation;
    prompt: string;
    model: string;
    history: ChatMessage[];
  }) => Promise<ChatMessage>;
  regenerate?: (payload: {
    conversation: AiConversation;
    message: ChatMessage;
    model: string;
    history: ChatMessage[];
  }) => Promise<ChatMessage>;
  clearConversation?: (conversation: AiConversation) => Promise<void>;
}

export interface AiChatAvatars {
  user?: string;
  assistant?: string;
}

export interface AiChatPanelProps {
  title?: string;
  placeholder?: string;
  initialConversations?: AiConversation[];
  initialMessages?: ConversationMessageMap;
  autoLoadConversations?: boolean;
  avatars?: AiChatAvatars;
  adapter?: AiChatAdapter;
}
