import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8041';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
}

export const supplierApi = {
  list: async (): Promise<Supplier[]> => {
    const response = await api.get('/api/v1/suppliers');
    return response.data.data;
  },
  create: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await api.post('/api/v1/suppliers', data);
    return response.data.data;
  },
  get: async (id: string): Promise<Supplier> => {
    const response = await api.get(`/api/v1/suppliers/${id}`);
    return response.data.data;
  },
  update: async (id: string, data: Partial<CreateSupplierRequest>): Promise<Supplier> => {
    const response = await api.put(`/api/v1/suppliers/${id}`, data);
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/suppliers/${id}`);
  },
};

export const evaluationApi = {
  list: async (): Promise<SupplierEvaluation[]> => {
    const response = await api.get('/api/v1/supplier-evaluations');
    return response.data.data;
  },
};

export const purchaseOrderApi = {
  list: async (): Promise<PurchaseOrder[]> => {
    const response = await api.get('/api/v1/purchase-orders');
    return response.data.data;
  },
};

export default api;