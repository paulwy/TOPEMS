/**
 * AI Chat page centralized state + handlers hook.
 *
 * Extracted from AiChatPage to separate stateful logic from presentation.
 */

export type ChatMode = 'qa' | 'summary' | 'code' | 'general';
type MessageType = 'text' | 'code' | 'summary' | 'qa' | 'general';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: MessageType;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  type: ChatMode;
}

export interface QuickPrompt {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactElement;
}

/** Returns the localized label for a message/session type. */
export const getTypeLabel = (type: Message['type'], t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    qa: t('ai.chat.type.qa'),
    summary: t('ai.chat.type.summary'),
    code: t('ai.chat.type.code'),
    general: t('ai.chat.type.general'),
    text: t('ai.chat.type.text'),
  };
  return labels[type || 'text'];
};
