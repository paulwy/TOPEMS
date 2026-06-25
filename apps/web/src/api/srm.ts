import apiClient from './client';
import type { ApiResponse } from './client';

export interface Supplier {
  id: string;
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risk_level: string;
}

export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  evaluation_no: string;
  evaluation_date: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierEvaluationRequest {
  supplier_id: string;
  evaluation_no: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  po_no: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  actual_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  po_no: string;
  supplier_id: string;
  expected_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
}

// Supplier Contract types
export interface SupplierContract {
  id: string;
  contract_no: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierContractRequest {
  contract_no: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
}

// Statistics types
export interface SrmStatistics {
  total_suppliers: number;
  active_suppliers: number;
  total_evaluations: number;
  avg_score: number;
  total_orders: number;
  total_order_amount: number;
  pending_orders: number;
  completed_orders: number;
  total_contracts: number;
  active_contracts: number;
}

export interface SupplierWithStats {
  supplier: Supplier;
  total_orders: number;
  total_amount: number;
  avg_evaluation_score?: number;
  last_order_date?: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
}

export interface MonthlyOrderTrend {
  month: string;
  order_count: number;
  total_amount: number;
}

export interface SrmDetailedStatistics {
  basic: SrmStatistics;
  supplier_by_category: CategoryCount[];
  supplier_by_status: StatusCount[];
  order_by_status: StatusCount[];
  evaluation_score_distribution: ScoreDistribution[];
  monthly_order_trend: MonthlyOrderTrend[];
  contract_by_status: StatusCount[];
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  total_amount: number;
  avg_quality_score?: number;
  avg_delivery_score?: number;
  avg_service_score?: number;
  avg_price_score?: number;
  avg_overall_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  last_evaluation_date?: string;
  evaluation_count: number;
}

export interface ScoringDimension {
  id: string;
  name: string;
  code: string;
  weight: number;
  min_score: number;
  max_score: number;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateScoringDimensionRequest {
  name: string;
  code: string;
  weight: number;
  min_score: number;
  max_score: number;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface PerformanceSummary {
  total_suppliers: number;
  evaluated_suppliers: number;
  evaluation_rate: number;
  avg_overall_score: number;
  top_supplier?: { name: string; avg_score: number };
  bottom_supplier?: { name: string; avg_score: number };
  category_scores: {
    category: string;
    avg_score: number;
    supplier_count: number;
  }[];
}

export interface ScoreLevelDistribution {
  level: string;
  label: string;
  count: number;
}

export interface ScoreLevelDefinitions {
  level: string;
  range: string;
  description: string;
}

export interface PerformanceReportParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  status?: string;
  supplier_id?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PerformanceReportDetail {
  id: string;
  supplier_id: string;
  supplier_name: string;
  report_period: string;
  overall_score: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  total_orders: number;
  total_amount: number;
  evaluation_count: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  generated_at: string;
}

export interface PerformanceTrendItem {
  period: string;
  avg_overall_score: number;
  avg_quality_score?: number;
  avg_delivery_score?: number;
  avg_service_score?: number;
  avg_price_score?: number;
  order_count: number;
  total_amount: number;
}

export interface PerformanceTrendResponse {
  supplier_id?: string;
  supplier_name?: string;
  period: string;
  trends: PerformanceTrendItem[];
}

export interface SupplierComparison {
  supplier_id: string;
  supplier_name: string;
  overall_score: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  total_orders: number;
  total_amount: number;
  evaluation_count: number;
  rank: number;
}

export interface SupplierComparisonResponse {
  suppliers: SupplierComparison[];
  comparison_date: string;
  best_supplier?: string;
  worst_supplier?: string;
}

export const srmApi = {
  // Suppliers
  listSuppliers: async (): Promise<ApiResponse<Supplier[]>> => {
    return apiClient.srm.get<Supplier[]>('/api/srm/suppliers');
  },
  getSupplier: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.get<Supplier>(`/api/srm/suppliers/${id}`);
  },
  createSupplier: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.post<Supplier>('/api/srm/suppliers', data);
  },
  updateSupplier: async (
    id: string,
    data: CreateSupplierRequest
  ): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.put<Supplier>(`/api/srm/suppliers/${id}`, data);
  },
  deleteSupplier: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/suppliers/${id}`);
  },

  // Supplier Evaluations
  listEvaluations: async (): Promise<ApiResponse<SupplierEvaluation[]>> => {
    return apiClient.srm.get<SupplierEvaluation[]>('/api/srm/supplier-evaluations');
  },
  getEvaluation: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.get<SupplierEvaluation>(`/api/srm/supplier-evaluations/${id}`);
  },
  createEvaluation: async (
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.post<SupplierEvaluation>('/api/srm/supplier-evaluations', data);
  },
  updateEvaluation: async (
    id: string,
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.put<SupplierEvaluation>(`/api/srm/supplier-evaluations/${id}`, data);
  },
  deleteEvaluation: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/supplier-evaluations/${id}`);
  },

  // Purchase Orders
  listPurchaseOrders: async (): Promise<ApiResponse<PurchaseOrder[]>> => {
    return apiClient.srm.get<PurchaseOrder[]>('/api/srm/purchase-orders');
  },
  getPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.get<PurchaseOrder>(`/api/srm/purchase-orders/${id}`);
  },
  createPurchaseOrder: async (
    data: CreatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.post<PurchaseOrder>('/api/srm/purchase-orders', data);
  },
  updatePurchaseOrder: async (
    id: string,
    data: CreatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.put<PurchaseOrder>(`/api/srm/purchase-orders/${id}`, data);
  },
  deletePurchaseOrder: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/purchase-orders/${id}`);
  },

  // Supplier Contracts
  listContracts: async (): Promise<ApiResponse<SupplierContract[]>> => {
    return apiClient.srm.get<SupplierContract[]>('/api/srm/supplier-contracts');
  },
  getContract: async (id: string): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.get<SupplierContract>(`/api/srm/supplier-contracts/${id}`);
  },
  createContract: async (
    data: CreateSupplierContractRequest
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.post<SupplierContract>('/api/srm/supplier-contracts', data);
  },
  updateContract: async (
    id: string,
    data: CreateSupplierContractRequest
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.put<SupplierContract>(`/api/srm/supplier-contracts/${id}`, data);
  },
  deleteContract: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/supplier-contracts/${id}`);
  },

  // Statistics
  getStatistics: async (): Promise<ApiResponse<SrmStatistics>> => {
    return apiClient.srm.get<SrmStatistics>('/api/srm/statistics');
  },
  getDetailedStatistics: async (): Promise<ApiResponse<SrmDetailedStatistics>> => {
    return apiClient.srm.get<SrmDetailedStatistics>('/api/srm/statistics/detailed');
  },
  getSuppliersWithStats: async (): Promise<ApiResponse<SupplierWithStats[]>> => {
    return apiClient.srm.get<SupplierWithStats[]>('/api/srm/suppliers-with-stats');
  },

  // Scoring Dimensions
  listScoringDimensions: async (): Promise<ApiResponse<ScoringDimension[]>> => {
    return apiClient.srm.get<ScoringDimension[]>('/api/srm/scoring-dimensions');
  },
  listActiveScoringDimensions: async (): Promise<ApiResponse<ScoringDimension[]>> => {
    return apiClient.srm.get<ScoringDimension[]>('/api/srm/scoring-dimensions/active');
  },
  getScoringDimension: async (id: string): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.get<ScoringDimension>(`/api/srm/scoring-dimensions/${id}`);
  },
  createScoringDimension: async (
    data: CreateScoringDimensionRequest
  ): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.post<ScoringDimension>('/api/srm/scoring-dimensions', data);
  },
  updateScoringDimension: async (
    id: string,
    data: CreateScoringDimensionRequest
  ): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.put<ScoringDimension>(`/api/srm/scoring-dimensions/${id}`, data);
  },
  deleteScoringDimension: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/scoring-dimensions/${id}`);
  },

  // Performance Reports
  getPerformanceReports: async (
    params?: PerformanceReportParams
  ): Promise<
    ApiResponse<{
      performances: SupplierPerformance[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.srm.get(`/api/srm/performance/reports${query ? `?${query}` : ''}`);
  },
  getPerformanceReport: async (id: string): Promise<ApiResponse<PerformanceReportDetail>> => {
    return apiClient.srm.get(`/api/srm/performance/reports/${id}`);
  },
  getPerformanceSummary: async (): Promise<ApiResponse<PerformanceSummary>> => {
    return apiClient.srm.get<PerformanceSummary>('/api/srm/performance/summary');
  },
  getScoreLevelDistribution: async (): Promise<
    ApiResponse<{
      distribution: ScoreLevelDistribution[];
      level_definitions: ScoreLevelDefinitions[];
    }>
  > => {
    return apiClient.srm.get('/api/srm/performance/score-level-distribution');
  },
  getTopSuppliers: async (): Promise<
    ApiResponse<{
      top_by_score: SupplierPerformance[];
      top_by_orders: SupplierPerformance[];
    }>
  > => {
    return apiClient.srm.get('/api/srm/performance/top-suppliers');
  },
  getPerformanceTrend: async (params?: {
    supplier_id?: string;
    period?: string;
  }): Promise<ApiResponse<PerformanceTrendResponse>> => {
    const query = new URLSearchParams(params).toString();
    return apiClient.srm.get(`/api/srm/performance/trend${query ? `?${query}` : ''}`);
  },
  compareSupplierPerformance: async (supplier_ids: string[]): Promise<ApiResponse<SupplierComparisonResponse>> => {
    return apiClient.srm.get(`/api/srm/performance/compare?supplier_ids=${supplier_ids.join(',')}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.srm.get<string>('/health');
  },
};
