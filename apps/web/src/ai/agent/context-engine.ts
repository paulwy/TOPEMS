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

export interface ConversationContext {
  messages: ConversationMessage[];
  entities: Entity[];
  topics: string[];
  sentiment: Sentiment;
  intent: Intent;
  summary?: string;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'product' | 'action';
  value: string;
  confidence: number;
}

export interface MemoryEntry {
  id: string;
  type: MemoryEntryType;
  content: string;
  timestamp: number;
  importance: number;
  metadata?: Record<string, unknown>;
}

export interface ContextWindow {
  maxMessages: number;
  maxTokens: number;
  summaryThreshold: number;
}

export interface ContextEvent {
  type:
    | 'input_processed'
    | 'context_updated'
    | 'memory_stored'
    | 'memory_retrieved'
    | 'context_summarized'
    | 'entity_extracted'
    | 'intent_detected';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

const DEFAULT_WINDOW: ContextWindow = {
  maxMessages: 50,
  maxTokens: 4000,
  summaryThreshold: 30,
};

const IMPORTANCE_WEIGHTS = {
  user_query: 1.0,
  action_result: 0.7,
  system_event: 0.4,
};
