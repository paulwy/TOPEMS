import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ==================== 类型定义 ====================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory =
  'credit' | 'market' | 'liquidity' | 'operational' | 'compliance' | 'fraud';
export type Regulation = 'sox' | 'gdpr' | 'pci_dss' | 'hipaa' | 'internal';
export type ReviewSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface RiskIndicator {
  id: string;
  category: string;
  level: string;
  current_value: number;
  threshold: number;
  unit: string;
  updated_at: string;
}

export interface RiskAlert {
  id: string;
  indicator_id: string;
  level: string;
  message: string;
  entity: string;
  created_at: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface RiskDashboard {
  total_indicators: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  composite_score: number;
  open_alerts: number;
  by_category: Record<string, number>;
}

export interface FraudRule {
  id: string;
  name: string;
  rule_type: string;
  condition: string;
  threshold: number;
  enabled: boolean;
}

interface FraudScore {
  id: string;
  transaction_id: string;
  score: number;
  triggered_rules: unknown;
  risk_level: string;
  recommendation: string;
  scored_at: string;
}

interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  merchant: string;
  location: string;
  device_id: string;
  timestamp: string;
  metadata?: unknown;
}

export interface ReviewRule {
  id: string;
  regulation: string;
  category: string;
  severity: string;
  action: string;
}

export interface ReviewResult {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  passed: boolean;
  details: unknown;
  reviewed_at: string;
  reviewer: string;
}

interface ReviewWorkflow {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  assigned_to?: string;
  steps: unknown;
  created_at: string;
  updated_at: string;
}

export interface ComplianceReport {
  entity_type: string;
  entity_id: string;
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  pass_rate: number;
  critical_issues: string[];
  high_issues: string[];
  medium_issues: string[];
  low_issues: string[];
  generated_at: string;
}

// ==================== 请求类型 ====================

interface RiskAlertsQuery {
  category?: string;
  entity?: string;
}

interface ScoreTransactionRequest {
  transaction: Transaction;
}

interface UpdateFraudRuleRequest {
  name?: string;
  condition?: string;
  threshold?: number;
  enabled?: boolean;
}

interface ReviewEntityRequest {
  entity_type: string;
  entity_id: string;
}

interface ReviewResultsQuery {
  entity_type?: string;
  entity_id?: string;
}

export interface CreateWorkflowRequest {
  entity_type: string;
  entity_id: string;
  assigned_to?: string;
  steps: string[];
}

interface ComplianceReportQuery {
  entity_type?: string;
  entity_id?: string;
}

// ==================== API ====================

export const riskV54Api = {
  // ==================== 实时风险监测 ====================

  getRiskDashboard(): Promise<ApiResponse<RiskDashboard>> {
    return apiClient.finance.get('/finance-v54/risk/dashboard');
  },

  getRiskAlerts(params?: RiskAlertsQuery): Promise<ApiResponse<RiskAlert[]>> {
    return apiClient.finance.get('/finance-v54/risk/alerts', { params });
  },

  acknowledgeAlert(id: string): Promise<ApiResponse<RiskAlert>> {
    return apiClient.finance.put(`/finance-v54/risk/alerts/${id}/acknowledge`);
  },

  resolveAlert(id: string): Promise<ApiResponse<RiskAlert>> {
    return apiClient.finance.put(`/finance-v54/risk/alerts/${id}/resolve`);
  },

  // ==================== 交易反欺诈 ====================

  scoreTransaction(data: ScoreTransactionRequest): Promise<ApiResponse<FraudScore>> {
    return apiClient.finance.post('/finance-v54/fraud/score', data);
  },

  getFraudRules(): Promise<ApiResponse<FraudRule[]>> {
    return apiClient.finance.get('/finance-v54/fraud/rules');
  },

  updateFraudRule(id: string, data: UpdateFraudRuleRequest): Promise<ApiResponse<FraudRule>> {
    return apiClient.finance.put(`/finance-v54/fraud/rules/${id}`, data);
  },

  getFraudScore(transactionId: string): Promise<ApiResponse<FraudScore>> {
    return apiClient.finance.get(`/finance-v54/fraud/scores/${transactionId}`);
  },

  // ==================== 合规自动审查 ====================

  reviewEntity(data: ReviewEntityRequest): Promise<ApiResponse<ReviewResult[]>> {
    return apiClient.finance.post('/finance-v54/compliance/review', data);
  },

  getReviewResults(params?: ReviewResultsQuery): Promise<ApiResponse<ReviewResult[]>> {
    return apiClient.finance.get('/finance-v54/compliance/results', { params });
  },

  getComplianceStatus(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ReviewWorkflow[]>> {
    return apiClient.finance.get(`/finance-v54/compliance/status/${entityType}/${entityId}`);
  },

  createWorkflow(data: CreateWorkflowRequest): Promise<ApiResponse<ReviewWorkflow>> {
    return apiClient.finance.post('/finance-v54/compliance/workflow', data);
  },

  advanceWorkflow(id: string): Promise<ApiResponse<ReviewWorkflow>> {
    return apiClient.finance.put(`/finance-v54/compliance/workflow/${id}/advance`);
  },

  getComplianceReport(params?: ComplianceReportQuery): Promise<ApiResponse<ComplianceReport>> {
    return apiClient.finance.get('/finance-v54/compliance/report', { params });
  },
};

export default riskV54Api;
