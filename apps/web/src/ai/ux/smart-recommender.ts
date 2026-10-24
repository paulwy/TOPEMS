export type RecommendationType = 'page' | 'action' | 'content' | 'feature';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  reason: string;
  confidence: number;
  context: Record<string, unknown>;
}
