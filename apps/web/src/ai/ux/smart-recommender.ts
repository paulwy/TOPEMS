export type RecommendationType = 'page' | 'action' | 'content' | 'feature';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  reason: string;
  confidence: number;
  context: Record<string, unknown>;
}

interface UserBehavior {
  userId: string;
  action: string;
  target: string;
  timestamp: number;
  sessionId: string;
}

interface RecommendationStats {
  total_recommendations: number;
  accepted_count: number;
  rejected_count: number;
  avg_confidence: number;
  top_categories: Array<{ type: RecommendationType; count: number }>;
}
