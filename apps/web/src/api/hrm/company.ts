import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Company, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
} from '@topems/shared-types';

export const companyApi: CrudOperations<Company> = {
  /**
   * A4 绑定样板：list_companies operation（openapi: GET /hrm/companies）
   * Query Params: { page, pageSize, search, status }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_companies'> | ListParams
  ): Promise<ApiResponse<PaginatedResult<Company>>> => {
    const openapiParams = params
      ? (toOpenApiParams(params as Record<string, unknown>) as ListParams)
      : undefined;
    const queryString = buildQueryString(openapiParams);
    return await apiClient.hrm.get(`/companies${queryString}`);
  },

  /**
   * A4 绑定样板：get_company operation（openapi: GET /hrm/companies/{id}）
   * 返回类型保持 ApiResponse<Company>（满足 CrudOperations 接口约束）。
   * 对应的 operation schema: TypedApiResponse<Company>。
   */
  get: (id: string): Promise<ApiResponse<Company>> => {
    return apiClient.hrm.get(`/companies/${id}`);
  },

  /**
   * A4 绑定样板：create_company operation（openapi: POST /hrm/companies）
   * Request Body: CreateCompanyRequest schema（发送前 adaptReverse → snake_case）
   */
  create: (
    data: AdaptedRequestBody<'create_company'> | Partial<Company>
  ): Promise<ApiResponse<Company>> => {
    return apiClient.hrm.post('/companies', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  update: (id: string, data: Partial<Company>): Promise<ApiResponse<Company>> => {
    return apiClient.hrm.put(`/companies/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/companies/${id}`);
  },
};

export default companyApi;
