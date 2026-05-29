import apiClient from './client';
import type { ApiResponse } from './client';

export interface Company {
  id: string;
  name: string;
  short_name?: string;
  registration_number?: string;
  tax_number?: string;
  address?: string;
  contact_phone?: string;
  email?: string;
  website?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  company_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  name: string;
  gender?: string;
  birth_date?: string;
  hire_date?: string;
  department_id?: string;
  position?: string;
  email?: string;
  phone?: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_number: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_amount?: number;
  location?: string;
  responsible_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const companyApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Company>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/companies${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Company>> {
    return apiClient.erp.get(`/api/v1/companies/${id}`);
  },
  
  async create(data: Partial<Company>): Promise<ApiResponse<Company>> {
    return apiClient.erp.post('/api/v1/companies', data);
  },
  
  async update(id: string, data: Partial<Company>): Promise<ApiResponse<Company>> {
    return apiClient.erp.put(`/api/v1/companies/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/companies/${id}`);
  },
};

function cleanEmptyUuids<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  if (result.parent_id === '') delete (result as any).parent_id;
  if (result.company_id === '') delete (result as any).company_id;
  if (result.department_id === '') delete (result as any).department_id;
  if (result.responsible_id === '') delete (result as any).responsible_id;
  return result;
}

export const departmentApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Department>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/departments${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Department>> {
    return apiClient.erp.get(`/api/v1/departments/${id}`);
  },
  
  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.erp.post('/api/v1/departments', cleanEmptyUuids(data));
  },
  
  async update(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.erp.put(`/api/v1/departments/${id}`, cleanEmptyUuids(data));
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/departments/${id}`);
  },
};

export const employeeApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Employee>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/employees${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Employee>> {
    return apiClient.erp.get(`/api/v1/employees/${id}`);
  },
  
  async create(data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return apiClient.erp.post('/api/v1/employees', cleanEmptyUuids(data));
  },
  
  async update(id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return apiClient.erp.put(`/api/v1/employees/${id}`, cleanEmptyUuids(data));
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/employees/${id}`);
  },
};

export const assetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Asset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/assets${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.erp.get(`/api/v1/assets/${id}`);
  },
  
  async create(data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.post('/api/v1/assets', cleanEmptyUuids(data));
  },
  
  async update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.put(`/api/v1/assets/${id}`, cleanEmptyUuids(data));
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/assets/${id}`);
  },
};

export const erpApi = {
  async health(): Promise<ApiResponse<string>> {
    return apiClient.erp.get<string>('/health');
  },
};
