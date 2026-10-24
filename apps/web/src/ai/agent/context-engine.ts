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
