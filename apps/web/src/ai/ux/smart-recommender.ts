import i18n from '@/i18n';

export type RecommendationType = 'page' | 'action' | 'content' | 'feature';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  reason: string;
  confidence: number;
  context: Record<string, unknown>;
}

export interface UserBehavior {
  userId: string;
  action: string;
  target: string;
  timestamp: number;
  sessionId: string;
}

export interface RecommendationStats {
  total_recommendations: number;
  accepted_count: number;
  rejected_count: number;
  avg_confidence: number;
  top_categories: Array<{ type: RecommendationType; count: number }>;
}

interface ContentItem {
  id: string;
  type: RecommendationType;
  title: string;
  tags: string[];
  metadata: Record<string, unknown>;
}
