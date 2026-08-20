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

function getDefaultContentLibrary(): ContentItem[] {
  return [
    {
      id: 'dashboard-main',
      type: 'page',
      title: i18n.t('ai.smart-recommender.k0'),
      tags: [i18n.t('ai.smart-recommender.k3'), i18n.t('ai.smart-recommender.k2'), i18n.t('ai.smart-recommender.k1')],
      metadata: { module: 'dashboard' },
    },
    {
      id: 'crm-dashboard',
      type: 'page',
      title: i18n.t('ai.smart-recommender.crm_0'),
      tags: [i18n.t('ai.smart-recommender.k6'), i18n.t('ai.smart-recommender.k5'), i18n.t('ai.smart-recommender.k4')],
      metadata: { module: 'crm' },
    },
    {
      id: 'hrm-dashboard',
      type: 'page',
      title: i18n.t('ai.smart-recommender.hrm_1'),
      tags: [i18n.t('ai.smart-recommender.k9'), i18n.t('ai.smart-recommender.k8'), i18n.t('ai.smart-recommender.k7')],
      metadata: { module: 'hrm' },
    },
    {
      id: 'mes-workorder',
      type: 'page',
      title: i18n.t('ai.smart-recommender.k10'),
      tags: [i18n.t('ai.smart-recommender.k13'), i18n.t('ai.smart-recommender.k12'), i18n.t('ai.smart-recommender.k11')],
      metadata: { module: 'mes' },
    },
    {
      id: 'scm-purchase',
      type: 'page',
      title: i18n.t('ai.smart-recommender.k14'),
      tags: [i18n.t('ai.smart-recommender.k17'), i18n.t('ai.smart-recommender.k16'), i18n.t('ai.smart-recommender.k15')],
      metadata: { module: 'scm' },
    },
    {
      id: 'quality-report',
      type: 'content',
      title: i18n.t('ai.smart-recommender.k18'),
      tags: [i18n.t('ai.smart-recommender.k20'), 'SPC', i18n.t('ai.smart-recommender.k19')],
      metadata: { module: 'qms' },
    },
    {
      id: 'financial-report',
      type: 'content',
      title: i18n.t('ai.smart-recommender.k21'),
      tags: [i18n.t('ai.smart-recommender.k24'), i18n.t('ai.smart-recommender.k23'), i18n.t('ai.smart-recommender.k22')],
      metadata: { module: 'finance' },
    },
    {
      id: 'deep-analyze',
      type: 'action',
      title: i18n.t('ai.smart-recommender.k25'),
      tags: [i18n.t('ai.smart-recommender.k27'), 'BI', i18n.t('ai.smart-recommender.k26')],
      metadata: { module: 'bi' },
    },
    {
      id: 'quick-approve',
      type: 'action',
      title: i18n.t('ai.smart-recommender.k28'),
      tags: [i18n.t('ai.smart-recommender.k31'), i18n.t('ai.smart-recommender.k30'), i18n.t('ai.smart-recommender.k29')],
      metadata: { module: 'workflow' },
    },
    {
      id: 'generate-report',
      type: 'action',
      title: i18n.t('ai.smart-recommender.k32'),
      tags: [i18n.t('ai.smart-recommender.k35'), i18n.t('ai.smart-recommender.k34'), i18n.t('ai.smart-recommender.k33')],
      metadata: { module: 'report' },
    },
    {
      id: 'ai-assistant',
      type: 'feature',
      title: i18n.t('ai.smart-recommender.ai_2'),
      tags: ['AI', i18n.t('ai.smart-recommender.k37'), i18n.t('ai.smart-recommender.k36')],
      metadata: { module: 'ai' },
    },
    {
      id: 'smart-search',
      type: 'feature',
      title: i18n.t('ai.smart-recommender.k38'),
      tags: [i18n.t('ai.smart-recommender.k40'), 'AI', i18n.t('ai.smart-recommender.k39')],
      metadata: { module: 'search' },
    },
  ];
}

