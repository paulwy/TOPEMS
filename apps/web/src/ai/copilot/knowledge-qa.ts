import i18n from '@/i18n';
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

type Listener = (entry: QAEntry) => void;

export class KnowledgeQA {
  private history: QAEntry[] = [];
  private documents: Map<string, KnowledgeDocument> = new Map();
  private tags: Set<string> = new Set();
  private listeners: Set<Listener> = new Set();
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  ask(question: string, context?: string): QAResult {
    const sources: string[] = [];
    const tags: string[] = [];
    let confidence = 0;

    const relevantDocs = this.findRelevantDocuments(question);

    for (const doc of relevantDocs) {
      sources.push(doc.source);
      for (const tag of doc.tags) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
      confidence += doc.content.length / 1000;
    }

    confidence = Math.min(confidence / 10, 1);
    if (relevantDocs.length === 0) {
      confidence = 0.3;
    }

    const answer = this.generateAnswer(question, relevantDocs, context);

    const entry: QAEntry = {
      id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question,
      answer,
      context,
      sources,
      confidence,
      timestamp: Date.now(),
      followUps: [],
      tags,
    };

    this.history.push(entry);
    this.listeners.forEach((l) => l(entry));

    const suggestions = this.generateFollowUps(question, relevantDocs);

    return {
      entry,
      relatedDocuments: relevantDocs,
      suggestions,
    };
  }

  searchKnowledge(query: string, limit: number = 10): KnowledgeDocument[] {
    const lowerQuery = query.toLowerCase();
    const results: KnowledgeDocument[] = [];

    for (const doc of this.documents.values()) {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const contentMatch = doc.content.toLowerCase().includes(lowerQuery);
      const tagMatch = doc.tags.some((t) => t.toLowerCase().includes(lowerQuery));

      if (titleMatch || contentMatch || tagMatch) {
        results.push(doc);
      }
    }

    return results
      .sort((a, b) => {
        const aScore = a.title.toLowerCase().includes(lowerQuery)
          ? 3
          : a.content.toLowerCase().includes(lowerQuery)
            ? 2
            : 1;
        const bScore = b.title.toLowerCase().includes(lowerQuery)
          ? 3
          : b.content.toLowerCase().includes(lowerQuery)
            ? 2
            : 1;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  getHistory(limit?: number): QAEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  addDocument(doc: Omit<KnowledgeDocument, 'id' | 'addedAt'>): KnowledgeDocument {
    const newDoc: KnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
    };
    this.documents.set(newDoc.id, newDoc);

    for (const tag of newDoc.tags) {
      this.tags.add(tag);
    }

    return newDoc;
  }

  getCitations(entryId: string): string[] {
    const entry = this.history.find((e) => e.id === entryId);
    if (!entry) return [];
    return entry.sources;
  }

  getTags(): string[] {
    return [...this.tags];
  }

  getDocuments(): KnowledgeDocument[] {
    return [...this.documents.values()];
  }

  getStats(): { totalQA: number; totalDocs: number; totalTags: number } {
    return {
      totalQA: this.history.length,
      totalDocs: this.documents.size,
      totalTags: this.tags.size,
    };
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private findRelevantDocuments(question: string): KnowledgeDocument[] {
    const lowerQuestion = question.toLowerCase();
    const terms = lowerQuestion.split(/\s+/).filter((t) => t.length > 2);

    const scored: Array<{ doc: KnowledgeDocument; score: number }> = [];

    for (const doc of this.documents.values()) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const tagsLower = doc.tags.map((t) => t.toLowerCase());

      for (const term of terms) {
        if (titleLower.includes(term)) score += 3;
        if (contentLower.includes(term)) score += 1;
        if (tagsLower.some((t) => t.includes(term))) score += 2;
      }

      if (lowerQuestion.includes(titleLower)) score += 5;

      if (score > 0) {
        scored.push({ doc, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.doc);
  }

  private generateAnswer(
    question: string,
    relevantDocs: KnowledgeDocument[],
    context?: string
  ): string {
    if (relevantDocs.length === 0) {
      return `${i18n.t('ai.knowledge-qa.k0')}${question}${i18n.t('ai.knowledge-qa.k1')}`;
    }

    const parts: string[] = [];
    parts.push(`${i18n.t('ai.knowledge-qa.k2')}${relevantDocs.length}${i18n.t('ai.knowledge-qa.k3')}${question}"：`);
    parts.push('');

    const mainDoc = relevantDocs[0];
    const summary = this.summarizeContent(mainDoc.content);
    parts.push(summary);

    if (relevantDocs.length > 1) {
      parts.push('');
      parts.push(i18n.t('ai.knowledge-qa.k0'));
      for (let i = 1; i < Math.min(relevantDocs.length, 4); i++) {
        parts.push(`  ${i}. ${relevantDocs[i].title}`);
      }
    }

    if (context) {
      parts.push('');
      parts.push(`${i18n.t('ai.knowledge-qa.k4')}${context}`);
    }

    return parts.join('\n');
  }

  private summarizeContent(content: string): string {
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length <= 3) {
      return content;
    }
    return `${sentences.slice(0, 3).join('. ')}.`;
  }

  private generateFollowUps(question: string, relevantDocs: KnowledgeDocument[]): string[] {
    const suggestions: string[] = [];

    if (relevantDocs.length > 0) {
      const mainDoc = relevantDocs[0];
      const sentences = mainDoc.content
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (sentences.length > 1) {
        const secondSentence = sentences[1];
        const questionKeywords = question.toLowerCase().split(/\s+/);
        const relevantWords = questionKeywords.filter((w) => w.length > 3);

        for (const word of relevantWords) {
          if (secondSentence.toLowerCase().includes(word)) {
            suggestions.push(`${i18n.t('ai.knowledge-qa.k5')}${secondSentence.substring(0, 40)}${i18n.t('ai.knowledge-qa.k6')}`);
            break;
          }
        }
      }
    }

    suggestions.push(i18n.t('ai.knowledge-qa.k1'));
    suggestions.push(i18n.t('ai.knowledge-qa.k2'));
    suggestions.push(i18n.t('ai.knowledge-qa.k3'));

    return suggestions.slice(0, 3);
  }
}

export const knowledgeQA = new KnowledgeQA();
