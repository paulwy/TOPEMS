import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ==================== 类型定义 ====================

type FraudSignalType = 'velocity' | 'geolocation' | 'device' | 'behavior' | 'pattern';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type FraudAction = 'approve' | 'review' | 'block';
type CreditGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D';
type StressScenarioType = 'market' | 'credit' | 'liquidity' | 'operational';
type ShockType = 'parallel' | 'sequential' | 'reverse';

interface FraudSignal {
  id: string;
  signal_type: string;
  score: number;
  confidence: number;
  metadata?: unknown;
  detected_at: string;
}

interface FraudDecision {
  id: string;
  transaction_id: string;
  risk_level: string;
  action: string;
  reason: string;
  signals?: unknown;
  decided_at: string;
}

interface DeviceProfile {
  id: string;
  device_id: string;
  fingerprint: string;
  trust_score: number;
  last_seen: string;
  ip_history?: unknown;
}

interface CreditProfile {
  id: string;
  entity_id: string;
  score: number;
  grade: string;
  factors?: unknown;
  updated_at: string;
}

interface ScoringModel {
  id: string;
  name: string;
  version: string;
  features?: unknown;
  weights?: unknown;
  accuracy: number;
  status: string;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

interface StressScenario {
  id: string;
  name: string;
  scenario_type: string;
  severity: string;
  assumptions?: unknown;
  created_at: string;
}

interface StressResult {
  id: string;
  scenario_id: string;
  entity_id: string;
  impact_value: number;
  capital_adequacy: number;
  liquidity_ratio: number;
  pass_fail: boolean;
  details?: unknown;
}

interface ScenarioParameter {
  name: string;
  base_value: number;
  shocked_value: number;
  shock_type: string;
}

export interface FraudRule {
  id: string;
  name: string;
  signal_type: string;
  threshold: number;
  enabled: boolean;
}

// ==================== 请求类型 ====================

interface AnalyzeTransactionRequest {
  transaction_id: string;
  amount?: number;
  device_id?: string;
  location?: string;
  metadata?: unknown;
}

interface SignalsQuery {
  signal_type?: string;
}

interface CreateDeviceRequest {
  device_id: string;
  fingerprint: string;
  trust_score?: number;
  ip_history?: unknown;
}

interface AddRuleRequest {
  name: string;
  signal_type: string;
  threshold?: number;
  enabled?: boolean;
}

interface CalculateScoreRequest {
  entity_id: string;
  features?: unknown;
  model_id?: string;
}

export interface CreateModelRequest {
  name: string;
  version?: string;
  features?: unknown;
  weights?: unknown;
  accuracy?: number;
}

interface UpdateModelRequest {
  name?: string;
  features?: unknown;
  weights?: unknown;
  accuracy?: number;
  status?: string;
}

interface FactorsQuery {
  entity_id?: string;
}

interface ModelComparisonQuery {
  model_ids: string[];
}

interface BulkScoreRequest {
  entity_ids: string[];
  model_id?: string;
}

interface CreateScenarioRequest {
  name: string;
  scenario_type?: string;
  severity?: string;
  assumptions?: unknown;
}

interface RunStressTestRequest {
  scenario_id: string;
  entity_id: string;
  parameters?: ScenarioParameter[];
}

interface CompareScenariosRequest {
  scenario_ids: string[];
}

interface ScenarioParamsQuery {
  scenario_id?: string;
}

// ==================== API ====================

export const riskV59Api = {
  // ==================== 实时反欺诈 ====================

  analyzeTransaction(data: AnalyzeTransactionRequest): Promise<ApiResponse<FraudDecision>> {
    return apiClient.finance.post('/finance-v59/fraud/analyze', data);
  },

  getFraudDecision(id: string): Promise<ApiResponse<FraudDecision>> {
    return apiClient.finance.get(`/finance-v59/fraud/decision/${id}`);
  },

  getSignals(params?: SignalsQuery): Promise<ApiResponse<FraudSignal[]>> {
    return apiClient.finance.get('/finance-v59/fraud/signals', { params });
  },

  createDevice(data: CreateDeviceRequest): Promise<ApiResponse<DeviceProfile>> {
    return apiClient.finance.post('/finance-v59/fraud/device', data);
  },

  getDevice(id: string): Promise<ApiResponse<DeviceProfile>> {
    return apiClient.finance.get(`/finance-v59/fraud/device/${id}`);
  },

  listBlockedDevices(): Promise<ApiResponse<DeviceProfile[]>> {
    return apiClient.finance.get('/finance-v59/fraud/blocked');
  },

  addRule(data: AddRuleRequest): Promise<ApiResponse<FraudRule>> {
    return apiClient.finance.post('/finance-v59/fraud/rule', data);
  },

  getRules(): Promise<ApiResponse<FraudRule[]>> {
    return apiClient.finance.get('/finance-v59/fraud/rules');
  },

  // ==================== 信用评分 ====================

  calculateScore(data: CalculateScoreRequest): Promise<ApiResponse<CreditProfile>> {
    return apiClient.finance.post('/finance-v59/credit/score', data);
  },

  getCreditProfile(id: string): Promise<ApiResponse<CreditProfile>> {
    return apiClient.finance.get(`/finance-v59/credit/profile/${id}`);
  },

  getScoringModels(): Promise<ApiResponse<ScoringModel[]>> {
    return apiClient.finance.get('/finance-v59/credit/models');
  },

  createModel(data: CreateModelRequest): Promise<ApiResponse<ScoringModel>> {
    return apiClient.finance.post('/finance-v59/credit/model', data);
  },

  updateModel(id: string, data: UpdateModelRequest): Promise<ApiResponse<ScoringModel>> {
    return apiClient.finance.put(`/finance-v59/credit/model/${id}`, data);
  },

  getScoreFactors(params?: FactorsQuery): Promise<ApiResponse<ScoreFactor[]>> {
    return apiClient.finance.get('/finance-v59/credit/factors', { params });
  },

  getModelComparison(params: ModelComparisonQuery): Promise<ApiResponse<unknown>> {
    return apiClient.finance.get('/finance-v59/credit/compare', { params });
  },

  bulkScore(data: BulkScoreRequest): Promise<ApiResponse<CreditProfile[]>> {
    return apiClient.finance.post('/finance-v59/credit/bulk', data);
  },

  // ==================== 压力测试 ====================

  createScenario(data: CreateScenarioRequest): Promise<ApiResponse<StressScenario>> {
    return apiClient.finance.post('/finance-v59/stress/scenario', data);
  },

  runStressTest(data: RunStressTestRequest): Promise<ApiResponse<StressResult>> {
    return apiClient.finance.post('/finance-v59/stress/run', data);
  },

  getTestResult(id: string): Promise<ApiResponse<StressResult>> {
    return apiClient.finance.get(`/finance-v59/stress/result/${id}`);
  },

  listScenarios(): Promise<ApiResponse<StressScenario[]>> {
    return apiClient.finance.get('/finance-v59/stress/scenarios');
  },

  compareScenarios(data: CompareScenariosRequest): Promise<ApiResponse<unknown>> {
    return apiClient.finance.post('/finance-v59/stress/compare', data);
  },

  getScenarioParameters(params?: ScenarioParamsQuery): Promise<ApiResponse<ScenarioParameter[]>> {
    return apiClient.finance.get('/finance-v59/stress/params', { params });
  },

  getTestSummary(): Promise<ApiResponse<unknown>> {
    return apiClient.finance.get('/finance-v59/stress/summary');
  },
};

export default riskV59Api;
