/* CRM 分析聚合端点（后端 svc/crm/src/modules/analytics.rs，2026-10-23 已接真实聚合）。
 * 7 个端点统一返回信封 { success, data, meta: { mock_enabled, use_frontend_fallback, note } }；
 * meta.mock_enabled 恒为 false（后端真实聚合，不再诱导前端走 seed=42 假数据）。
 * 路径相对 apiClient.crm（baseURL=/api/crm）：/dashboard/overview、/analytics/{funnel,scoring,forecast,segmentation,billing,recommendation}。
 */
import { apiClient } from '../client';

export type Period = 'MTD' | 'QTD' | 'YTD' | 'ROLLING_12M';

export interface AnalyticsMeta {
  mock_enabled: boolean;
  use_frontend_fallback: boolean;
  note: string;
}

export interface AnalyticsEnvelope<T> {
  success: boolean;
  data: T;
  meta: AnalyticsMeta;
  code?: number;
  message?: string;
}

/** GET /dashboard/overview */
export interface OverviewNameValue {
  name: string;
  value: number;
}
export interface OverviewData {
  total_customers: number;
  active_customers: number;
  total_opportunities: number;
  open_opportunities: number;
  won_opportunities: number;
  opportunity_stages: OverviewNameValue[];
}

/** GET /analytics/funnel */
export interface FunnelStageRow {
  stage: string;
  count: number;
  total_value: number;
  weighted_value: number;
}
export interface FunnelAnalyticsData {
  stages: FunnelStageRow[];
}

/** GET /analytics/scoring */
export interface ScoringAnalyticsData {
  /** 评分等级分布（name=score_level，value=客户数） */
  distribution: OverviewNameValue[];
  /** RFM 分群分布（name=segment，value=客户数） */
  rfm: OverviewNameValue[];
}

/** GET /analytics/forecast */
export interface ForecastSeriesRow {
  period: string;
  period_type: string;
  predicted_amount: number;
  actual_amount: number;
  confidence_level: number;
  trend: string;
}
export interface ForecastAnalyticsData {
  series: ForecastSeriesRow[];
}

/** GET /analytics/segmentation */
export interface SegmentationQuadrantRow {
  value_band: string; // high_value | low_value | unknown_value
  activity_band: string; // high_activity | low_activity
  customer_count: number;
}
export interface SegmentationAnalyticsData {
  quadrants: SegmentationQuadrantRow[];
}

/** GET /analytics/billing */
export interface BillingStatusRow {
  status: string;
  count: number;
  amount: number;
}
export interface BillingTopCustomerRow {
  name: string;
  value: number;
}
export interface BillingAgingRow {
  name: string;
  value: number; // 该账龄桶客户数（后端只聚合 count，无金额）
}
export interface BillingAnalyticsData {
  status_pie: BillingStatusRow[];
  top_customers: BillingTopCustomerRow[];
  aging: BillingAgingRow[];
}

/** GET /analytics/recommendation */
export interface RecommendationByTypeRow {
  type: string;
  count: number;
  avg_confidence: number;
}
export interface RecommendationRecentRow {
  customer_name: string;
  type: string;
  confidence: number;
}
export interface RecommendationAnalyticsData {
  by_type: RecommendationByTypeRow[];
  recent: RecommendationRecentRow[];
}

async function getAnalytics<T>(path: string, period?: Period): Promise<AnalyticsEnvelope<T>> {
  return apiClient.crm.get<T, AnalyticsEnvelope<T>>(
    path,
    period ? { params: { period } } : undefined
  );
}

export const crmAnalyticsApi = {
  /** GET /dashboard/overview — 客户/商机关键指标与阶段分布 */
  getOverview: (period?: Period) => getAnalytics<OverviewData>('/dashboard/overview', period),
  /** GET /analytics/funnel — 按商机阶段统计数量/金额/加权金额 */
  getFunnel: (period?: Period) => getAnalytics<FunnelAnalyticsData>('/analytics/funnel', period),
  /** GET /analytics/scoring — 评分等级分布 + RFM 分群分布 */
  getScoring: (period?: Period) => getAnalytics<ScoringAnalyticsData>('/analytics/scoring', period),
  /** GET /analytics/forecast — 各期间预测/实际/置信度 */
  getForecast: (period?: Period) =>
    getAnalytics<ForecastAnalyticsData>('/analytics/forecast', period),
  /** GET /analytics/segmentation — 价值×活动四象限客户分布 */
  getSegmentation: (period?: Period) =>
    getAnalytics<SegmentationAnalyticsData>('/analytics/segmentation', period),
  /** GET /analytics/billing — 账单状态饼 + Top10 客户应收 + 账龄桶 */
  getBilling: (period?: Period) => getAnalytics<BillingAnalyticsData>('/analytics/billing', period),
  /** GET /analytics/recommendation — 按推荐类型分布 + 最近推荐 */
  getRecommendation: (period?: Period) =>
    getAnalytics<RecommendationAnalyticsData>('/analytics/recommendation', period),
};

export default crmAnalyticsApi;
