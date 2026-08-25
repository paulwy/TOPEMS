export interface QAEntry {
  id: string;
  question: string;
  answer: string;
  context?: string;
  sources: string[];
  confidence: number;
  timestamp: number;
  followUps: QAEntry[];
  parentId?: string;
  tags: string[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  addedAt: number;
}

export interface QAResult {
  entry: QAEntry;
  relatedDocuments: KnowledgeDocument[];
  suggestions: string[];
}
