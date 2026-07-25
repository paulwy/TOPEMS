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

interface BehaviorCluster {
  userId: string;
  behaviors: UserBehavior[];
  score: number;
}

interface ContentItem {
  id: string;
  type: RecommendationType;
  title: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

const DEFAULT_CONTENT_LIBRARY: ContentItem[] = [
  {
    id: 'dashboard-main',
    type: 'page',
    title: '综合仪表盘',
    tags: ['首页', '概览', '核心指标'],
    metadata: { module: 'dashboard' },
  },
  {
    id: 'crm-dashboard',
    type: 'page',
    title: 'CRM 仪表盘',
    tags: ['客户', '销售', '漏斗'],
    metadata: { module: 'crm' },
  },
  {
    id: 'hrm-dashboard',
    type: 'page',
    title: 'HRM 仪表盘',
    tags: ['员工', '考勤', '绩效'],
    metadata: { module: 'hrm' },
  },
  {
    id: 'mes-workorder',
    type: 'page',
    title: '生产工单',
    tags: ['制造', '工单', '排产'],
    metadata: { module: 'mes' },
  },
  {
    id: 'scm-purchase',
    type: 'page',
    title: '采购订单',
    tags: ['采购', '供应商', '订单'],
    metadata: { module: 'scm' },
  },
  {
    id: 'quality-report',
    type: 'content',
    title: '质量分析报告',
    tags: ['质量', 'SPC', '分析'],
    metadata: { module: 'qms' },
  },
  {
    id: 'financial-report',
    type: 'content',
    title: '财务报表',
    tags: ['财务', '报表', '分析'],
    metadata: { module: 'finance' },
  },
  {
    id: 'deep-analyze',
    type: 'action',
    title: '深度数据分析',
    tags: ['分析', 'BI', '钻取'],
    metadata: { module: 'bi' },
  },
  {
    id: 'quick-approve',
    type: 'action',
    title: '快速审批',
    tags: ['审批', '工作流', '快捷'],
    metadata: { module: 'workflow' },
  },
  {
    id: 'generate-report',
    type: 'action',
    title: '生成报告',
    tags: ['报告', '生成', '自动化'],
    metadata: { module: 'report' },
  },
  {
    id: 'ai-assistant',
    type: 'feature',
    title: 'AI 智能助手',
    tags: ['AI', '助手', '智能'],
    metadata: { module: 'ai' },
  },
  {
    id: 'smart-search',
    type: 'feature',
    title: '智能搜索',
    tags: ['搜索', 'AI', '语义'],
    metadata: { module: 'search' },
  },
];

export class SmartRecommender {
  private static instance: SmartRecommender | null = null;
  private behaviors: Map<string, UserBehavior[]> = new Map();
  private interactionCounts: Map<string, Map<string, number>> = new Map();
  private acceptedRecs: Set<string> = new Set();
  private rejectedRecs: Set<string> = new Set();
  private contentLibrary: ContentItem[] = DEFAULT_CONTENT_LIBRARY;

  private constructor() {}

  static getInstance(): SmartRecommender {
    if (!SmartRecommender.instance) {
      SmartRecommender.instance = new SmartRecommender();
    }
    return SmartRecommender.instance;
  }

  get_recommendations(
    userId: string,
    context: Record<string, unknown> = {},
    limit: number = 5
  ): Recommendation[] {
    const userBehaviors = this.behaviors.get(userId) || [];
    const collaborativeResults = this.collaborative_filtering(userId, userBehaviors);
    const contentResults = this.content_based_filtering(userBehaviors);

    const merged = [...collaborativeResults, ...contentResults];
    const deduplicated = this.deduplicate(merged);

    return deduplicated
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
      .map((rec) => ({
        ...rec,
        context: { ...context, generated_at: Date.now() },
      }));
  }

  record_behavior(behavior: UserBehavior): void {
    const userBehaviors = this.behaviors.get(behavior.userId) || [];
    userBehaviors.push(behavior);

    if (userBehaviors.length > 1000) {
      userBehaviors.splice(0, userBehaviors.length - 1000);
    }
    this.behaviors.set(behavior.userId, userBehaviors);

    const key = `${behavior.action}:${behavior.target}`;
    let countMap = this.interactionCounts.get(behavior.userId);
    if (!countMap) {
      countMap = new Map();
      this.interactionCounts.set(behavior.userId, countMap);
    }
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  get_personalized_content(userId: string, category?: RecommendationType): Recommendation[] {
    const userBehaviors = this.behaviors.get(userId) || [];
    const results = this.content_based_filtering(userBehaviors);

    if (category) {
      return results.filter((r) => r.type === category);
    }
    return results;
  }

  get_trending(limit: number = 5): Recommendation[] {
    const scoreMap = new Map<string, number>();

    for (const [, behaviors] of this.behaviors) {
      const recent = behaviors.filter((b) => Date.now() - b.timestamp < 86400000);
      for (const b of recent) {
        const key = `${b.action}:${b.target}`;
        scoreMap.set(key, (scoreMap.get(key) || 0) + 1);
      }
    }

    const sorted = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([key, score]) => {
      const [action, target] = key.split(':');
      const item = this.contentLibrary.find((c) => c.id === target);
      return {
        id: `trending-${key}`,
        type: (item?.type || 'action') as RecommendationType,
        reason: `热门趋势: ${action} ${target} (${score} 次)`,
        confidence: Math.min(0.95, 0.5 + score * 0.05),
        context: { trend_score: score, action, target },
      };
    });
  }

  get_similar_items(itemId: string, limit: number = 5): Recommendation[] {
    const item = this.contentLibrary.find((c) => c.id === itemId);
    if (!item) return [];

    const similar = this.contentLibrary
      .filter((c) => c.id !== itemId)
      .map((c) => ({
        item: c,
        similarity: this.compute_similarity(item, c),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similar.map((s) => ({
      id: `similar-${s.item.id}`,
      type: s.item.type,
      reason: `与 "${item.title}" 相似 (相似度: ${s.similarity.toFixed(2)})`,
      confidence: s.similarity,
      context: { source_item: itemId, similarity: s.similarity },
    }));
  }

  get_recommendation_stats(): RecommendationStats {
    let total = 0;
    const typeCounts = new Map<RecommendationType, number>();
    const totalConfidence = 0;

    for (const [, behaviors] of this.behaviors) {
      total += behaviors.length;
      for (const b of behaviors) {
        const item = this.contentLibrary.find((c) => c.id === b.target);
        const type = (item?.type || 'action') as RecommendationType;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    }

    const categories = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_recommendations: total,
      accepted_count: this.acceptedRecs.size,
      rejected_count: this.rejectedRecs.size,
      avg_confidence: total > 0 ? totalConfidence / total : 0,
      top_categories: categories.slice(0, 5),
    };
  }

  mark_accepted(recommendationId: string): void {
    this.acceptedRecs.add(recommendationId);
    this.rejectedRecs.delete(recommendationId);
  }

  mark_rejected(recommendationId: string): void {
    this.rejectedRecs.add(recommendationId);
    this.acceptedRecs.delete(recommendationId);
  }

  add_content_item(item: ContentItem): void {
    this.contentLibrary.push(item);
  }

  private collaborative_filtering(userId: string, userBehaviors: UserBehavior[]): Recommendation[] {
    if (userBehaviors.length < 3) return [];

    const clusters: BehaviorCluster[] = [];
    const targetItems = new Set(userBehaviors.map((b) => b.target));

    for (const [otherUserId, otherBehaviors] of this.behaviors) {
      if (otherUserId === userId) continue;

      const overlap = otherBehaviors.filter((b) => targetItems.has(b.target));
      if (overlap.length >= 2) {
        const score = overlap.length / Math.max(targetItems.size, otherBehaviors.length);
        clusters.push({
          userId: otherUserId,
          behaviors: otherBehaviors,
          score,
        });
      }
    }

    clusters.sort((a, b) => b.score - a.score);
    const topClusters = clusters.slice(0, 3);

    const candidates = new Map<string, { score: number; type: RecommendationType }>();

    for (const cluster of topClusters) {
      const clusterTargets = new Set(cluster.behaviors.map((b) => b.target));
      const novelTargets = Array.from(clusterTargets).filter((t) => !targetItems.has(t));

      for (const target of novelTargets) {
        const item = this.contentLibrary.find((c) => c.id === target);
        if (item) {
          const weight = cluster.score * 0.8;
          candidates.set(target, {
            score: (candidates.get(target)?.score || 0) + weight,
            type: item.type,
          });
        }
      }
    }

    return Array.from(candidates.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([target, data]) => {
        const item = this.contentLibrary.find((c) => c.id === target);
        return {
          id: `cf-${target}`,
          type: data.type,
          reason: `协同过滤: 与您行为相似的用户也浏览了 "${item?.title || target}"`,
          confidence: Math.min(0.9, data.score),
          context: { method: 'collaborative', target },
        };
      });
  }

  private content_based_filtering(userBehaviors: UserBehavior[]): Recommendation[] {
    if (userBehaviors.length === 0) return [];

    const targetTags = new Set<string>();
    const targetTypes = new Set<RecommendationType>();

    for (const b of userBehaviors) {
      const item = this.contentLibrary.find((c) => c.id === b.target);
      if (item) {
        item.tags.forEach((t) => targetTags.add(t));
        targetTypes.add(item.type);
      }
    }

    const candidates = this.contentLibrary
      .filter((item) => {
        const inUserHistory = userBehaviors.some((b) => b.target === item.id);
        return !inUserHistory;
      })
      .map((item) => {
        const tagOverlap = item.tags.filter((t) => targetTags.has(t)).length;
        const typeMatch = targetTypes.has(item.type) ? 0.3 : 0;
        const score = tagOverlap / Math.max(item.tags.length, 1) + typeMatch;

        return {
          item,
          score: Math.min(0.95, score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return candidates.map((c) => ({
      id: `cb-${c.item.id}`,
      type: c.item.type,
      reason: `内容匹配: 基于您的兴趣标签推荐 "${c.item.title}"`,
      confidence: c.score,
      context: { method: 'content_based', item_id: c.item.id },
    }));
  }

  private compute_similarity(a: ContentItem, b: ContentItem): number {
    const tagA = new Set(a.tags);
    const tagB = new Set(b.tags);
    const intersection = a.tags.filter((t) => tagB.has(t));
    const union = new Set([...tagA, ...tagB]);
    const jaccard = intersection.length / Math.max(union.size, 1);
    const typeMatch = a.type === b.type ? 0.2 : 0;
    return Math.min(1, jaccard + typeMatch);
  }

  private deduplicate(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }
}

export const smartRecommender = SmartRecommender.getInstance();
