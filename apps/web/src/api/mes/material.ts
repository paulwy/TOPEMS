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
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/boms${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.get(`/boms/${id}`);
  },

  async create(data: CreateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.post('/boms', data);
  },

  async update(id: string, data: UpdateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.put(`/boms/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/boms/${id}`);
  },
};

export const materialIssueApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      issues: MaterialIssue[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/material-issues${queryString ? `?${queryString}` : ''}`);
  },

  async create(data: CreateMaterialIssueRequest): Promise<ApiResponse<MaterialIssue>> {
    return apiClient.mes.post('/material-issues', data);
  },
};

export const materialReturnApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      returns: MaterialReturn[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/material-returns${queryString ? `?${queryString}` : ''}`);
  },

  async create(data: CreateMaterialReturnRequest): Promise<ApiResponse<MaterialReturn>> {
    return apiClient.mes.post('/material-returns', data);
  },
};
