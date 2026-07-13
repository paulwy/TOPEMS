import type {
  DataModel,
  ModelField,
  ModelRelation,
  DataPreviewParams,
  DataPreviewResult,
} from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const listDataModels = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  dataSourceId?: string;
  status?: string;
}): Promise<ApiResponse<{ items: DataModel[]; total: number; page: number; pageSize: number }>> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.dataSourceId) query.set('data_source_id', params.dataSourceId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/data-models${qs ? `?${qs}` : ''}`);
};

export const getDataModel = async (modelId: string): Promise<ApiResponse<DataModel>> => {
  return apiClient.core.get(`/lowcode/data-models/${modelId}`);
};

export const createDataModel = async (data: Partial<DataModel>): Promise<ApiResponse<DataModel>> => {
  return apiClient.core.post('/lowcode/data-models', data);
};

export const updateDataModel = async (
  modelId: string,
  data: Partial<DataModel>
): Promise<ApiResponse<DataModel>> => {
  return apiClient.core.put(`/lowcode/data-models/${modelId}`, data);
};

export const deleteDataModel = async (modelId: string): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/data-models/${modelId}`);
};

export const addField = async (
  modelId: string,
  field: Partial<ModelField>
): Promise<ApiResponse<ModelField>> => {
  return apiClient.core.post(`/lowcode/data-models/${modelId}/fields`, field);
};

export const updateField = async (
  modelId: string,
  fieldId: string,
  field: Partial<ModelField>
): Promise<ApiResponse<ModelField>> => {
  return apiClient.core.put(`/lowcode/data-models/${modelId}/fields/${fieldId}`, field);
};

export const deleteField = async (modelId: string, fieldId: string): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/data-models/${modelId}/fields/${fieldId}`);
};

export const addRelation = async (
  modelId: string,
  relation: Partial<ModelRelation>
): Promise<ApiResponse<ModelRelation>> => {
  return apiClient.core.post(`/lowcode/data-models/${modelId}/relations`, relation);
};

export const deleteRelation = async (
  modelId: string,
  relationId: string
): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/data-models/${modelId}/relations/${relationId}`);
};

export const getDataPreview = async (
  params: DataPreviewParams
): Promise<ApiResponse<DataPreviewResult>> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  if (params.filters) query.set('filters', JSON.stringify(params.filters));
  if (params.sort?.field) query.set('sort_field', params.sort.field);
  if (params.sort?.direction) query.set('sort_order', params.sort.direction);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/data-models/${params.modelId}/data${qs ? `?${qs}` : ''}`);
};

export const publishModel = async (modelId: string): Promise<ApiResponse<DataModel>> => {
  return apiClient.core.post(`/lowcode/data-models/${modelId}/publish`);
};

export const dataModelApi = {
  listDataModels,
  getDataModel,
  createDataModel,
  updateDataModel,
  deleteDataModel,
  addField,
  updateField,
  deleteField,
  addRelation,
  deleteRelation,
  getDataPreview,
  publishModel,
};
