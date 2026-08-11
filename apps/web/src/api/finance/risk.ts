import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudAlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type ComplianceStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface RiskDashboard {
  total_alerts: number;
  open_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  fraud_score_avg?: number;
  compliance_pass_rate?: number;
  recent_alerts?: FraudAlert[];
  trend?: Array<{ date: string; count: number }>;
}

export interface FraudAlert {
  id: string;
  tenant_id: string;
  alert_type: string;
  risk_level: RiskLevel;
  transaction_id?: string;
  description?: string;
  status: FraudAlertStatus;
  confidence?: number;
  entity_type?: string;
  entity_id?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface FraudScoreRequest {
  transaction_id?: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  device_fingerprint?: string;
  user_id?: string;
  counterparty_id?: string;
  metadata?: Record<string, unknown>;
}

export interface FraudScoreResult {
  transaction_id: string;
  score: number;
  risk_level: RiskLevel;
  is_fraud: boolean;
  reasons: string[];
  speed_check?: {
    passed: boolean;
    score: number;
  };
  amount_check?: {
    passed: boolean;
    threshold?: number;
  };
  location_check?: {
    passed: boolean;
    country_code?: string;
  };
  device_check?: {
    passed: boolean;
    is_known_device: boolean;
  };
  recommendations?: string[];
}

export interface FraudRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  rule_type: 'speed' | 'amount' | 'location' | 'device' | 'pattern';
  threshold?: number;
  params?: Record<string, unknown>;
  is_active: boolean;
  priority?: number;
  created_at: string;
  updated_at: string;
}

export interface FraudRuleUpdate {
  name?: string;
  description?: string;
  rule_type?: FraudRule['rule_type'];
  threshold?: number;
  params?: Record<string, unknown>;
  is_active?: boolean;
  priority?: number;
}

export interface ComplianceReviewRequest {
  entity_type: 'transaction' | 'voucher' | 'payment' | 'expense' | 'invoice';
  entity_id: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceResult {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  status: ComplianceStatus;
  risk_level: RiskLevel;
  findings: Array<{
    rule_id?: string;
    rule_name?: string;
    severity: RiskLevel;
    description: string;
    remediation?: string;
  }>;
  reviewed_at?: string;
  reviewer_id?: string;
  created_at: string;
}

export interface ComplianceWorkflow {
  id: string;
  tenant_id: string;
  result_id: string;
  step: number;
  total_steps: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  approver_id?: string;
  approver_name?: string;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

export interface ComplianceReport {
  period: string;
  total_reviews: number;
  passed: number;
  failed: number;
  pending: number;
  by_entity_type: Record<string, number>;
  by_severity: Record<RiskLevel, number>;
  top_violations: Array<{ rule: string; count: number }>;
  generated_at: string;
}

export const riskApi = {
  // ==================== 风控仪表盘 ====================

  getDashboard: (): Promise<ApiResponse<RiskDashboard>> => {
    return apiClient.finance.get('/finance-v54/risk/dashboard');
  },

  // ==================== 风险告警 ====================

  listAlerts: (params?: {
    status?: FraudAlertStatus;
    risk_level?: RiskLevel;
    alert_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: FraudAlert[]; total: number }>> => {
    return apiClient.finance.get('/finance-v54/risk/alerts', { params });
  },

  acknowledgeAlert: (id: string, data?: { comment?: string }): Promise<ApiResponse<FraudAlert>> => {
    return apiClient.finance.put(`/finance-v54/risk/alerts/${id}/acknowledge`, data || {});
  },

  resolveAlert: (id: string, data?: { resolution?: string }): Promise<ApiResponse<FraudAlert>> => {
    return apiClient.finance.put(`/finance-v54/risk/alerts/${id}/resolve`, data || {});
  },

  // ==================== 交易反欺诈 ====================

  scoreTransaction: (data: FraudScoreRequest): Promise<ApiResponse<FraudScoreResult>> => {
    return apiClient.finance.post('/finance-v54/fraud/score', data);
  },

  getTransactionScore: (transactionId: string): Promise<ApiResponse<FraudScoreResult>> => {
    return apiClient.finance.get(`/finance-v54/fraud/scores/${transactionId}`);
  },

  // ==================== 反欺诈规则 ====================

  listFraudRules: (params?: { is_active?: boolean }): Promise<ApiResponse<FraudRule[]>> => {
    return apiClient.finance.get('/finance-v54/fraud/rules', { params });
  },

  getFraudRule: (id: string): Promise<ApiResponse<FraudRule>> => {
    return apiClient.finance.get(`/finance-v54/fraud/rules/${id}`);
  },

  createFraudRule: (
    data: Omit<FraudRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<FraudRule>> => {
    return apiClient.finance.post('/finance-v54/fraud/rules', data);
  },

  updateFraudRule: (id: string, data: FraudRuleUpdate): Promise<ApiResponse<FraudRule>> => {
    return apiClient.finance.put(`/finance-v54/fraud/rules/${id}`, data);
  },

  deleteFraudRule: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/finance-v54/fraud/rules/${id}`);
  },

  // ==================== 合规自动审查 ====================

  reviewCompliance: (data: ComplianceReviewRequest): Promise<ApiResponse<ComplianceResult>> => {
    return apiClient.finance.post('/finance-v54/compliance/review', data);
  },

  listComplianceResults: (params?: {
    entity_type?: string;
    status?: ComplianceStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: ComplianceResult[]; total: number }>> => {
    return apiClient.finance.get('/finance-v54/compliance/results', { params });
  },

  getComplianceStatus: (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ComplianceResult>> => {
    return apiClient.finance.get(`/finance-v54/compliance/status/${entityType}/${entityId}`);
  },

  startComplianceWorkflow: (data: {
    result_id: string;
    assignee_id?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<ApiResponse<ComplianceWorkflow>> => {
    return apiClient.finance.post('/finance-v54/compliance/workflow', data);
  },

  advanceComplianceWorkflow: (
    id: string,
    data?: {
      action: 'approve' | 'reject' | 'delegate';
      comment?: string;
      assignee_id?: string;
    }
  ): Promise<ApiResponse<ComplianceWorkflow>> => {
    return apiClient.finance.put(
      `/finance-v54/compliance/workflow/${id}/advance`,
      data || { action: 'approve' }
    );
  },

  getComplianceReport: (params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<ComplianceReport>> => {
    return apiClient.finance.get('/finance-v54/compliance/report', { params });
  },
};

export default riskApi;
