import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Department, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
} from '@topems/shared-types';

export const departmentApi: CrudOperations<Department> = {
  /**
   * A4 绑定样板：list_departments operation（openapi: GET /hrm/departments）
   * Query Params: { page, pageSize, search, status, orgId }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_departments'> | ListParams
  ): Promise<ApiResponse<PaginatedResult<Department>>> => {
    const openapiParams = params
      ? (toOpenApiParams(params as Record<string, unknown>) as ListParams)
      : undefined;
    const queryString = buildQueryString(openapiParams);
    return await apiClient.hrm.get(`/departments${queryString}`);
  },

  /**
   * A4 绑定样板：get_department operation（openapi: GET /hrm/departments/{id}）
   * 返回类型保持 ApiResponse<Department>（满足 CrudOperations 接口约束）。
   * 对应的 operation schema: TypedApiResponse<Department>。
   */
  get: (id: string): Promise<ApiResponse<Department>> => {
    return apiClient.hrm.get(`/departments/${id}`);
  },

  /**
   * A4 绑定样板：create_department operation（openapi: POST /hrm/departments）
   */
  create: (
    data: AdaptedRequestBody<'create_department'> | Partial<Department>
  ): Promise<ApiResponse<Department>> => {
    return apiClient.hrm.post(
      '/departments',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  update: (id: string, data: Partial<Department>): Promise<ApiResponse<Department>> => {
    return apiClient.hrm.put(`/departments/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/departments/${id}`);
  },
};

export default departmentApi;
