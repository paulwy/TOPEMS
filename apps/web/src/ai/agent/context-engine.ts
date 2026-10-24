export type MemoryEntryType = 'user_query' | 'action_result' | 'system_event';
export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Intent =
  'query' | 'command' | 'exploration' | 'confirmation' | 'correction' | 'social' | 'unclear';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'product' | 'action';
  value: string;
  confidence: number;
}
