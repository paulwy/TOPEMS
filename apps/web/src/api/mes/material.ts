import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  MaterialBom,
  CreateMaterialBomRequest,
  UpdateMaterialBomRequest,
  MaterialIssue,
  CreateMaterialIssueRequest,
  MaterialReturn,
  CreateMaterialReturnRequest,
} from './types';

export const materialBomApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      boms: MaterialBom[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/boms${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.get(`/api/mes/boms/${id}`);
  },

  async create(data: CreateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.post('/api/mes/boms', data);
  },

  async update(id: string, data: UpdateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.put(`/api/mes/boms/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/boms/${id}`);
  },
};

export const materialIssueApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      issues: MaterialIssue[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/material-issues${queryString ? '?' + queryString : ''}`);
  },

  async create(data: CreateMaterialIssueRequest): Promise<ApiResponse<MaterialIssue>> {
    return apiClient.mes.post('/api/mes/material-issues', data);
  },
};

export const materialReturnApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      returns: MaterialReturn[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/material-returns${queryString ? '?' + queryString : ''}`);
  },

  async create(data: CreateMaterialReturnRequest): Promise<ApiResponse<MaterialReturn>> {
    return apiClient.mes.post('/api/mes/material-returns', data);
  },
};
