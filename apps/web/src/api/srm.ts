import apiClient from "./client";
import type { ApiResponse } from "./client";

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

export const srmApi = {
  // Suppliers
  listSuppliers: async (): Promise<ApiResponse<Supplier[]>> => {
    return apiClient.srm.get<Supplier[]>("/api/srm/suppliers");
  },
  getSupplier: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.get<Supplier>(`/api/srm/suppliers/${id}`);
  },
  createSupplier: async (
    data: CreateSupplierRequest,
  ): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.post<Supplier>("/api/srm/suppliers", data);
  },
  updateSupplier: async (
    id: string,
    data: CreateSupplierRequest,
  ): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.put<Supplier>(`/api/srm/suppliers/${id}`, data);
  },
  deleteSupplier: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/suppliers/${id}`);
  },

  // Supplier Evaluations
  listEvaluations: async (): Promise<ApiResponse<SupplierEvaluation[]>> => {
    return apiClient.srm.get<SupplierEvaluation[]>(
      "/api/srm/supplier-evaluations",
    );
  },
  getEvaluation: async (
    id: string,
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.get<SupplierEvaluation>(
      `/api/srm/supplier-evaluations/${id}`,
    );
  },
  createEvaluation: async (
    data: CreateSupplierEvaluationRequest,
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.post<SupplierEvaluation>(
      "/api/srm/supplier-evaluations",
      data,
    );
  },
  updateEvaluation: async (
    id: string,
    data: CreateSupplierEvaluationRequest,
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.put<SupplierEvaluation>(
      `/api/srm/supplier-evaluations/${id}`,
      data,
    );
  },
  deleteEvaluation: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/supplier-evaluations/${id}`);
  },

  // Purchase Orders
  listPurchaseOrders: async (): Promise<ApiResponse<PurchaseOrder[]>> => {
    return apiClient.srm.get<PurchaseOrder[]>("/api/srm/purchase-orders");
  },
  getPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.get<PurchaseOrder>(`/api/srm/purchase-orders/${id}`);
  },
  createPurchaseOrder: async (
    data: CreatePurchaseOrderRequest,
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.post<PurchaseOrder>("/api/srm/purchase-orders", data);
  },
  updatePurchaseOrder: async (
    id: string,
    data: CreatePurchaseOrderRequest,
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.put<PurchaseOrder>(
      `/api/srm/purchase-orders/${id}`,
      data,
    );
  },
  deletePurchaseOrder: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/purchase-orders/${id}`);
  },

  // Supplier Contracts
  listContracts: async (): Promise<ApiResponse<SupplierContract[]>> => {
    return apiClient.srm.get<SupplierContract[]>("/api/srm/supplier-contracts");
  },
  getContract: async (id: string): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.get<SupplierContract>(
      `/api/srm/supplier-contracts/${id}`,
    );
  },
  createContract: async (
    data: CreateSupplierContractRequest,
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.post<SupplierContract>(
      "/api/srm/supplier-contracts",
      data,
    );
  },
  updateContract: async (
    id: string,
    data: CreateSupplierContractRequest,
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.put<SupplierContract>(
      `/api/srm/supplier-contracts/${id}`,
      data,
    );
  },
  deleteContract: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/srm/supplier-contracts/${id}`);
  },

  // Statistics
  getStatistics: async (): Promise<ApiResponse<SrmStatistics>> => {
    return apiClient.srm.get<SrmStatistics>("/api/srm/statistics");
  },
  getDetailedStatistics: async (): Promise<
    ApiResponse<SrmDetailedStatistics>
  > => {
    return apiClient.srm.get<SrmDetailedStatistics>(
      "/api/srm/statistics/detailed",
    );
  },
  getSuppliersWithStats: async (): Promise<
    ApiResponse<SupplierWithStats[]>
  > => {
    return apiClient.srm.get<SupplierWithStats[]>(
      "/api/srm/suppliers-with-stats",
    );
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.srm.get<string>("/health");
  },
};
