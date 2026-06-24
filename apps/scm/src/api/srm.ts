/**
 * SRM (Supplier Relationship Management) API
 * 供应商关系管理 API
 */

import { createRequest } from '@topems/shared-utils';

// ============= 基础类型 =============

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  supplier_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

function buildQueryString(params?: ListParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============= 业务实体 =============

export interface CollaborationSupplier {
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

export interface CreateCollaborationSupplierRequest {
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

export interface Inquiry {
  id: string;
  inquiry_no: string;
  title: string;
  category: string;
  status: string;
  publish_date?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInquiryRequest {
  inquiry_no: string;
  title: string;
  category: string;
  status: string;
  publish_date?: string;
  deadline?: string;
  remarks?: string;
}

export interface Quote {
  id: string;
  quote_no: string;
  inquiry_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  total_amount?: number;
  status: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteRequest {
  quote_no: string;
  inquiry_id?: string;
  supplier_id?: string;
  total_amount?: number;
  valid_until?: string;
  status: string;
}

export interface Tender {
  id: string;
  tender_no: string;
  title: string;
  project_name?: string;
  budget?: number;
  status: string;
  publish_date?: string;
  bid_deadline?: string;
  open_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenderRequest {
  tender_no: string;
  title: string;
  project_name?: string;
  budget?: number;
  status: string;
  publish_date?: string;
  bid_deadline?: string;
  open_date?: string;
  description?: string;
}

export interface Bid {
  id: string;
  bid_no: string;
  tender_id: string;
  supplier_id: string;
  supplier_name?: string;
  bid_amount: number;
  status: string;
  submit_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBidRequest {
  bid_no: string;
  tender_id: string;
  supplier_id: string;
  bid_amount: number;
  status: string;
  submit_date?: string;
  remarks?: string;
}

// ============= 客户端 =============

const api = createRequest('/api/srm');

// ============= 供应商协同 API =============

export const collaborationSupplierApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/suppliers${queryString}`);
    return response.data as PaginatedResult<CollaborationSupplier>;
  },
  get: async (id: string) => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data as CollaborationSupplier;
  },
  create: async (data: CreateCollaborationSupplierRequest) => {
    const response = await api.post('/suppliers', data);
    return response.data as CollaborationSupplier;
  },
  update: async (id: string, data: CreateCollaborationSupplierRequest) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data as CollaborationSupplier;
  },
  delete: async (id: string) => {
    await api.delete(`/suppliers/${id}`);
  },
};

// ============= 询价 API =============

export const inquiryApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inquiries${queryString}`);
    return response.data as PaginatedResult<Inquiry>;
  },
  get: async (id: string) => {
    const response = await api.get(`/inquiries/${id}`);
    return response.data as Inquiry;
  },
  create: async (data: CreateInquiryRequest) => {
    const response = await api.post('/inquiries', data);
    return response.data as Inquiry;
  },
  update: async (id: string, data: Partial<Inquiry>) => {
    const response = await api.put(`/inquiries/${id}`, data);
    return response.data as Inquiry;
  },
  delete: async (id: string) => {
    await api.delete(`/inquiries/${id}`);
  },
  publish: async (id: string) => {
    const response = await api.put(`/inquiries/${id}/publish`);
    return response.data as Inquiry;
  },
  close: async (id: string) => {
    const response = await api.put(`/inquiries/${id}/close`);
    return response.data as Inquiry;
  },
};

// ============= 报价 API =============

export const quoteApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/quotes${queryString}`);
    return response.data as PaginatedResult<Quote>;
  },
  get: async (id: string) => {
    const response = await api.get(`/quotes/${id}`);
    return response.data as Quote;
  },
  create: async (data: CreateQuoteRequest) => {
    const response = await api.post('/quotes', data);
    return response.data as Quote;
  },
  update: async (id: string, data: Partial<Quote>) => {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data as Quote;
  },
  delete: async (id: string) => {
    await api.delete(`/quotes/${id}`);
  },
  accept: async (id: string) => {
    const response = await api.put(`/quotes/${id}/accept`);
    return response.data as Quote;
  },
  reject: async (id: string, reason?: string) => {
    const response = await api.put(`/quotes/${id}/reject`, { reason });
    return response.data as Quote;
  },
};

// ============= 招投标 API =============

export const tenderApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/tenders${queryString}`);
    return response.data as PaginatedResult<Tender>;
  },
  get: async (id: string) => {
    const response = await api.get(`/tenders/${id}`);
    return response.data as Tender;
  },
  create: async (data: CreateTenderRequest) => {
    const response = await api.post('/tenders', data);
    return response.data as Tender;
  },
  update: async (id: string, data: Partial<Tender>) => {
    const response = await api.put(`/tenders/${id}`, data);
    return response.data as Tender;
  },
  delete: async (id: string) => {
    await api.delete(`/tenders/${id}`);
  },
  publish: async (id: string) => {
    const response = await api.put(`/tenders/${id}/publish`);
    return response.data as Tender;
  },
  cancel: async (id: string) => {
    const response = await api.put(`/tenders/${id}/cancel`);
    return response.data as Tender;
  },
};

export const bidApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/bids${queryString}`);
    return response.data as PaginatedResult<Bid>;
  },
  get: async (id: string) => {
    const response = await api.get(`/bids/${id}`);
    return response.data as Bid;
  },
  create: async (data: CreateBidRequest) => {
    const response = await api.post('/bids', data);
    return response.data as Bid;
  },
  update: async (id: string, data: Partial<Bid>) => {
    const response = await api.put(`/bids/${id}`, data);
    return response.data as Bid;
  },
  delete: async (id: string) => {
    await api.delete(`/bids/${id}`);
  },
  submit: async (id: string) => {
    const response = await api.put(`/bids/${id}/submit`);
    return response.data as Bid;
  },
  award: async (id: string) => {
    const response = await api.put(`/bids/${id}/award`);
    return response.data as Bid;
  },
};

// ============= 统一导出 =============

export const srmApi = {
  suppliers: collaborationSupplierApi,
  inquiries: inquiryApi,
  quotes: quoteApi,
  tenders: tenderApi,
  bids: bidApi,

  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default srmApi;
