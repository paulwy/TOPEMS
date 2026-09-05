/**
 * AI 治理仪表盘 API 调用
 *
 * 提供 AI 治理仪表盘的 API 调用封装，支持：
 * - 治理仪表盘数据获取
 * - 治理评分
 * - 风险评估
 * - 合规状态
 * - 成本分析
 * - 性能指标
 * - 安全事件
 * - 审计日志
 * - 趋势数据
 * - 建议和改进项
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ============================================================================
// 类型定义
// ============================================================================

/** 时间范围 */
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

/** 治理等级 */
export type GovernanceLevel = 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 性能等级 */
export type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor';

/** 建议优先级 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/** 合规框架状态 */
export type ComplianceFrameworkStatus =
  'compliant' | 'partially_compliant' | 'non_compliant' | 'under_assessment';

/** 关键指标 */
export interface KeyMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  total_tokens: number;
  average_response_ms: number;
  p95_response_ms: number;
  active_users: number;
  active_agents: number;
  total_tool_calls: number;
  cache_hit_rate: number;
}

/** 风险维度 */
export interface RiskDimension {
  level: RiskLevel;
  score: number;
  description: string;
  factors: string[];
}

/** 风险项 */
export interface RiskItem {
  risk_id: string;
  category: string;
  description: string;
  level: RiskLevel;
  impact: string;
  recommendation: string;
  detected_at: string;
}

/** 风险评估 */
export interface RiskAssessment {
  overall_risk_level: RiskLevel;
  risk_score: number;
  security_risk: RiskDimension;
  compliance_risk: RiskDimension;
  cost_risk: RiskDimension;
  performance_risk: RiskDimension;
  data_risk: RiskDimension;
  high_risk_items: RiskItem[];
}

/** 合规框架 */
export interface ComplianceFramework {
  name: string;
  description: string;
  compliance_rate: number;
  status: ComplianceFrameworkStatus;
}

/** 不合规项 */
export interface NonCompliantItem {
  item_id: string;
  framework: string;
  control: string;
  description: string;
  severity: RiskLevel;
  remediation: string;
  due_date?: string;
  status: string;
}

/** 合规状态 */
export interface ComplianceStatus {
  overall_compliance_rate: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  pending_checks: number;
  frameworks: ComplianceFramework[];
  non_compliant_items: NonCompliantItem[];
}

/** 预算使用情况 */
export interface BudgetUsage {
  total_budget: number;
  used_amount: number;
  usage_percent: number;
  budget_period: string;
  is_over_budget: boolean;
  projected_overage: number;
}

/** 成本资源 */
export interface CostResource {
  resource_id: string;
  name: string;
  resource_type: string;
  cost: number;
  call_count: number;
  cost_percent: number;
}

/** 成本分析 */
export interface CostAnalysis {
  total_cost: number;
  currency: string;
  llm_cost: number;
  tool_cost: number;
  storage_cost: number;
  network_cost: number;
  other_cost: number;
  average_cost_per_request: number;
  cost_trend_percent: number;
  budget_usage: BudgetUsage;
  top_cost_resources: CostResource[];
}

/** 性能指标 */
export interface PerformanceMetrics {
  average_response_ms: number;
  p50_response_ms: number;
  p90_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  throughput: number;
  concurrency: number;
  error_rate: number;
  timeout_rate: number;
  retry_rate: number;
  performance_level: PerformanceLevel;
}

/** 安全事件摘要 */
export interface SecurityEventSummary {
  event_id: string;
  event_type: string;
  severity: RiskLevel;
  description: string;
  occurred_at: string;
  affected_resource: string;
  status: string;
}

/** 审计日志摘要 */
export interface AuditSummary {
  total_audit_logs: number;
  by_operation: Record<string, number>;
  by_user_top10: Array<[string, number]>;
  by_resource_type: Record<string, number>;
  anomalous_operations: number;
  unauthorized_attempts: number;
}

/** 趋势数据点 */
export interface TrendDataPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avg_response_ms: number;
  tokens: number;
  cost: number;
}

/** 建议和改进项 */
export interface Recommendation {
  recommendation_id: string;
  category: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  expected_benefit: string;
  implementation_effort: string;
  related_metrics: string[];
}

/** 治理仪表盘数据 */
export interface GovernanceDashboardData {
  generated_at: string;
  time_range: TimeRange;
  overall_score: number;
  governance_level: GovernanceLevel;
  key_metrics: KeyMetrics;
  risk_assessment: RiskAssessment;
  compliance_status: ComplianceStatus;
  cost_analysis: CostAnalysis;
  performance_metrics: PerformanceMetrics;
  security_events: SecurityEventSummary[];
  audit_summary: AuditSummary;
  trends: TrendDataPoint[];
  recommendations: Recommendation[];
}

// ============================================================================
// API 函数
// ============================================================================

const BASE_PATH = '/api/ai/dsh/governance';

/**
 * 获取治理仪表盘数据
 */
export async function getGovernanceDashboard(
  time_range: TimeRange = '24h'
): Promise<ApiResponse<GovernanceDashboardData>> {
  return apiClient.get(`${BASE_PATH}/dashboard`, {
    params: { time_range },
  });
}

/**
 * 获取治理评分
 */
export async function getGovernanceScore(time_range?: TimeRange): Promise<
  ApiResponse<{
    overall_score: number;
    governance_level: GovernanceLevel;
    breakdown: {
      security: number;
      compliance: number;
      cost: number;
      performance: number;
      reliability: number;
    };
  }>
> {
  return apiClient.get(`${BASE_PATH}/score`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取风险评估
 */
export async function getRiskAssessment(
  time_range?: TimeRange
): Promise<ApiResponse<RiskAssessment>> {
  return apiClient.get(`${BASE_PATH}/risk`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取合规状态
 */
export async function getComplianceStatus(
  framework?: string
): Promise<ApiResponse<ComplianceStatus>> {
  return apiClient.get(`${BASE_PATH}/compliance`, {
    params: framework ? { framework } : undefined,
  });
}

/**
 * 获取成本分析
 */
export async function getCostAnalysis(time_range?: TimeRange): Promise<ApiResponse<CostAnalysis>> {
  return apiClient.get(`${BASE_PATH}/cost`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取性能指标
 */
export async function getPerformanceMetrics(
  time_range?: TimeRange
): Promise<ApiResponse<PerformanceMetrics>> {
  return apiClient.get(`${BASE_PATH}/performance`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取关键指标
 */
export async function getKeyMetrics(time_range?: TimeRange): Promise<ApiResponse<KeyMetrics>> {
  return apiClient.get(`${BASE_PATH}/metrics`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取安全事件
 */
export async function getSecurityEvents(params?: {
  severity?: RiskLevel;
  limit?: number;
  offset?: number;
}): Promise<
  ApiResponse<{
    items: SecurityEventSummary[];
    total: number;
  }>
> {
  return apiClient.get(`${BASE_PATH}/security-events`, { params });
}

/**
 * 获取审计日志摘要
 */
export async function getAuditSummary(time_range?: TimeRange): Promise<ApiResponse<AuditSummary>> {
  return apiClient.get(`${BASE_PATH}/audit`, {
    params: time_range ? { time_range } : undefined,
  });
}

/**
 * 获取趋势数据
 */
export async function getTrends(
  time_range: TimeRange = '24h',
  metrics?: string[]
): Promise<ApiResponse<TrendDataPoint[]>> {
  return apiClient.get(`${BASE_PATH}/trends`, {
    params: {
      time_range,
      metrics: metrics?.join(','),
    },
  });
}

/**
 * 获取建议和改进项
 */
export async function getRecommendations(
  priority?: RecommendationPriority
): Promise<ApiResponse<Recommendation[]>> {
  return apiClient.get(`${BASE_PATH}/recommendations`, {
    params: priority ? { priority } : undefined,
  });
}

/**
 * 记录安全事件
 */
export async function recordSecurityEvent(
  event: Omit<SecurityEventSummary, 'event_id' | 'occurred_at'>
): Promise<ApiResponse<SecurityEventSummary>> {
  return apiClient.post(`${BASE_PATH}/security-events`, event);
}

/**
 * 刷新仪表盘缓存
 */
export async function refreshDashboardCache(): Promise<ApiResponse<void>> {
  return apiClient.post(`${BASE_PATH}/refresh`);
}

/**
 * 导出治理报告
 */
export async function exportGovernanceReport(
  format: 'pdf' | 'excel' | 'json' = 'pdf',
  time_range?: TimeRange
): Promise<Blob> {
  const response = await apiClient.get(`${BASE_PATH}/export`, {
    params: { format, time_range },
    responseType: 'blob',
  });
  return response.data as Blob;
}
