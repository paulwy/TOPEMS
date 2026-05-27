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

export const srmApi = {
  // Suppliers
  listSuppliers: async (): Promise<ApiResponse<Supplier[]>> => {
    return apiClient.srm.get<Supplier[]>('/api/v1/suppliers');
  },
  getSupplier: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.get<Supplier>(`/api/v1/suppliers/${id}`);
  },
  createSupplier: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.post<Supplier>('/api/v1/suppliers', data);
  },
  updateSupplier: async (id: string, data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.put<Supplier>(`/api/v1/suppliers/${id}`, data);
  },
  deleteSupplier: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/v1/suppliers/${id}`);
  },

  // Supplier Evaluations
  listEvaluations: async (): Promise<ApiResponse<SupplierEvaluation[]>> => {
    return apiClient.srm.get<SupplierEvaluation[]>('/api/v1/supplier-evaluations');
  },
  getEvaluation: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.get<SupplierEvaluation>(`/api/v1/supplier-evaluations/${id}`);
  },
  createEvaluation: async (data: CreateSupplierEvaluationRequest): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.post<SupplierEvaluation>('/api/v1/supplier-evaluations', data);
  },
  updateEvaluation: async (id: string, data: CreateSupplierEvaluationRequest): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.put<SupplierEvaluation>(`/api/v1/supplier-evaluations/${id}`, data);
  },
  deleteEvaluation: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/v1/supplier-evaluations/${id}`);
  },

  // Purchase Orders
  listPurchaseOrders: async (): Promise<ApiResponse<PurchaseOrder[]>> => {
    return apiClient.srm.get<PurchaseOrder[]>('/api/v1/purchase-orders');
  },
  getPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.get<PurchaseOrder>(`/api/v1/purchase-orders/${id}`);
  },
  createPurchaseOrder: async (data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.post<PurchaseOrder>('/api/v1/purchase-orders', data);
  },
  updatePurchaseOrder: async (id: string, data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.put<PurchaseOrder>(`/api/v1/purchase-orders/${id}`, data);
  },
  deletePurchaseOrder: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/api/v1/purchase-orders/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.srm.get<string>('/health');
  },
};
