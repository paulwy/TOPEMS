import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerQueryParams,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
} from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const customerApi = {
  /**
   * A4 绑定样板：list_customers operation（openapi: GET /crm/customers）
   * Query Params: { page, pageSize, search, status, customerType, rating, industry } （AdaptedQuery 后为 camelCase）
   * 运行时：自动 adaptReverse → snake_case 发送给后端
   */
  list: async (
    params?: AdaptedQuery<'list_customers'> | CustomerQueryParams
  ): Promise<TypedPaginatedResponse<Customer>> => {
    return apiClient.crm.get('/customers', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * A4 绑定样板：create_customer operation（openapi: POST /crm/customers）
   * Request Body: CreateCustomerRequest schema（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'create_customer'> | CreateCustomerRequest
  ): Promise<TypedApiResponse<Customer>> => {
    return apiClient.crm.post('/customers', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  /**
   * A4 绑定样板：get_customer operation（openapi: GET /crm/customers/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Customer>> => {
    return apiClient.crm.get(`/customers/${id}`);
  },

  update: async (id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> => {
    return apiClient.crm.put(`/customers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/customers/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/customers/batch-delete', { ids });
  },

  startApproval: async (
    id: string,
    data: { workflowId: string; comment?: string }
  ): Promise<ApiResponse<{ customerId: string; workflowId: string; approvalStatus: string }>> => {
    return apiClient.crm.post(
      `/customers/${id}/approval/start`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  approve: async (
    id: string,
    data?: { comment?: string }
  ): Promise<ApiResponse<{ customerId: string; approvalStatus: string }>> => {
    return apiClient.crm.post(
      `/customers/${id}/approval/approve`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {}
    );
  },

  reject: async (
    id: string,
    data?: { comment?: string; reason?: string }
  ): Promise<ApiResponse<{ customerId: string; approvalStatus: string }>> => {
    return apiClient.crm.post(
      `/customers/${id}/approval/reject`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {}
    );
  },

  getTags: async (id: string): Promise<ApiResponse<Tag[]>> => {
    return apiClient.crm.get(`/customers/${id}/tags`);
  },

  addTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.post(`/customers/${id}/tags`, {
      tag_id: tagId,
    });
  },

  removeTag: async (id: string, tagId: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/customers/${id}/tags/${tagId}`);
  },
};

export const tagApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Tag>>> => {
    return apiClient.crm.get('/tags', { params });
  },

  create: async (data: CreateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.post('/tags', data);
  },

  get: async (id: string): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.get(`/tags/${id}`);
  },

  update: async (id: string, data: UpdateTagRequest): Promise<ApiResponse<Tag>> => {
    return apiClient.crm.put(`/tags/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/tags/${id}`);
  },

  getTaggedCustomers: async (id: string): Promise<ApiResponse<unknown[]>> => {
    return apiClient.crm.get(`/tags/${id}/customers`);
  },
};

export default customerApi;
