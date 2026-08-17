import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface AddressContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  position?: string;
  department_id?: string;
  department_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AddressContactListResponse {
  contacts: AddressContact[];
  total: number;
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  parent_id?: string;
  children?: DepartmentTreeNode[];
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const addressbookApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<AddressContactListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    return apiClient.erp.get<AddressContactListResponse>(
      `/addressbook${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<AddressContact>> {
    return apiClient.erp.get<AddressContact>(`/addressbook/${id}`);
  },

  async search(
    keyword: string,
    page?: number,
    pageSize?: number
  ): Promise<ApiResponse<AddressContactListResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('keyword', keyword);
    if (page) searchParams.set('page', page.toString());
    const ps = pageSize !== undefined ? pageSize.toString() : undefined;
    if (ps) searchParams.set('pagesize', ps);
    return apiClient.erp.get<AddressContactListResponse>(
      `/addressbook/search?${searchParams.toString()}`
    );
  },

  async getDepartmentTree(): Promise<ApiResponse<DepartmentTreeNode[]>> {
    return apiClient.erp.get<DepartmentTreeNode[]>('/addressbook/departments/tree');
  },

  async export(format?: 'csv' | 'json'): Promise<ApiResponse<string>> {
    const searchParams = new URLSearchParams();
    if (format) searchParams.set('format', format);
    return apiClient.erp.get<string>(
      `/addressbook/export${format ? `?${searchParams.toString()}` : ''}`
    );
  },
};
