import axios from 'axios';
import type {
  ApiResponse,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierEvaluation,
  CreateSupplierEvaluationRequest,
  UpdateSupplierEvaluationRequest,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SupplierContract,
  CreateSupplierContractRequest,
  UpdateSupplierContractRequest,
  SupplierProduct,
  CreateSupplierProductRequest,
  UpdateSupplierProductRequest,
  SupplierCategory,
  SrmStatistics,
  SupplierWithStats,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8041/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const supplierApi = {
  list: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<ApiResponse<Supplier[]>>('/suppliers');
    return response.data.data || [];
  },

  get: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateSupplierRequest): Promise<Supplier> => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },

  getWithStats: async (id: string): Promise<SupplierWithStats> => {
    const response = await apiClient.get<ApiResponse<SupplierWithStats>>(`/suppliers/${id}/stats`);
    return response.data.data!;
  },
};

export const evaluationApi = {
  list: async (): Promise<SupplierEvaluation[]> => {
    const response = await apiClient.get<ApiResponse<SupplierEvaluation[]>>('/supplier-evaluations');
    return response.data.data || [];
  },

  listBySupplier: async (supplierId: string): Promise<SupplierEvaluation[]> => {
    const response = await apiClient.get<ApiResponse<SupplierEvaluation[]>>(
      `/suppliers/${supplierId}/evaluations`
    );
    return response.data.data || [];
  },

  get: async (id: string): Promise<SupplierEvaluation> => {
    const response = await apiClient.get<ApiResponse<SupplierEvaluation>>(`/supplier-evaluations/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateSupplierEvaluationRequest): Promise<SupplierEvaluation> => {
    const response = await apiClient.post<ApiResponse<SupplierEvaluation>>('/supplier-evaluations', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateSupplierEvaluationRequest): Promise<SupplierEvaluation> => {
    const response = await apiClient.put<ApiResponse<SupplierEvaluation>>(`/supplier-evaluations/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/supplier-evaluations/${id}`);
  },
};

export const purchaseOrderApi = {
  list: async (): Promise<PurchaseOrder[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrder[]>>('/purchase-orders');
    return response.data.data || [];
  },

  listBySupplier: async (supplierId: string): Promise<PurchaseOrder[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrder[]>>(
      `/suppliers/${supplierId}/orders`
    );
    return response.data.data || [];
  },

  get: async (id: string): Promise<PurchaseOrder> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
    return response.data.data!;
  },

  create: async (data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> => {
    const response = await apiClient.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}`);
  },
};

export const contractApi = {
  list: async (): Promise<SupplierContract[]> => {
    const response = await apiClient.get<ApiResponse<SupplierContract[]>>('/supplier-contracts');
    return response.data.data || [];
  },

  listBySupplier: async (supplierId: string): Promise<SupplierContract[]> => {
    const response = await apiClient.get<ApiResponse<SupplierContract[]>>(
      `/suppliers/${supplierId}/contracts`
    );
    return response.data.data || [];
  },

  get: async (id: string): Promise<SupplierContract> => {
    const response = await apiClient.get<ApiResponse<SupplierContract>>(`/supplier-contracts/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateSupplierContractRequest): Promise<SupplierContract> => {
    const response = await apiClient.post<ApiResponse<SupplierContract>>('/supplier-contracts', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateSupplierContractRequest): Promise<SupplierContract> => {
    const response = await apiClient.put<ApiResponse<SupplierContract>>(`/supplier-contracts/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/supplier-contracts/${id}`);
  },
};

export const productApi = {
  list: async (): Promise<SupplierProduct[]> => {
    const response = await apiClient.get<ApiResponse<SupplierProduct[]>>('/supplier-products');
    return response.data.data || [];
  },

  listBySupplier: async (supplierId: string): Promise<SupplierProduct[]> => {
    const response = await apiClient.get<ApiResponse<SupplierProduct[]>>(
      `/suppliers/${supplierId}/products`
    );
    return response.data.data || [];
  },

  get: async (id: string): Promise<SupplierProduct> => {
    const response = await apiClient.get<ApiResponse<SupplierProduct>>(`/supplier-products/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateSupplierProductRequest): Promise<SupplierProduct> => {
    const response = await apiClient.post<ApiResponse<SupplierProduct>>('/supplier-products', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateSupplierProductRequest): Promise<SupplierProduct> => {
    const response = await apiClient.put<ApiResponse<SupplierProduct>>(`/supplier-products/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/supplier-products/${id}`);
  },
};

export const categoryApi = {
  list: async (): Promise<SupplierCategory[]> => {
    const response = await apiClient.get<ApiResponse<SupplierCategory[]>>('/supplier-categories');
    return response.data.data || [];
  },

  get: async (id: string): Promise<SupplierCategory> => {
    const response = await apiClient.get<ApiResponse<SupplierCategory>>(`/supplier-categories/${id}`);
    return response.data.data!;
  },
};

export const statisticsApi = {
  get: async (): Promise<SrmStatistics> => {
    const response = await apiClient.get<ApiResponse<SrmStatistics>>('/statistics');
    return response.data.data!;
  },
};

export default apiClient;
