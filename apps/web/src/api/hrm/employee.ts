import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Employee,
  Role,
  Position,
  ListParams,
  PaginatedResult,
  CrudOperations,
  PerformanceReview,
  PerformanceGoal,
} from './types';
import { buildQueryString } from './types';
import {
  toOpenApiRequestBody,
  type TypedApiResponse,
} from '@topems/shared-types';

function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: async (params?: ListParams) => {
      const queryString = buildQueryString(params);
      return await apiClient.hrm.get(`${endpoint}${queryString}`);
    },

    get: (id: string) => {
      return apiClient.hrm.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.hrm.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.hrm.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.hrm.delete(`${endpoint}/${id}`);
    },
  };
}

export const employeeApi: CrudOperations<Employee> = {
  /**
   * A4 绑定样板：list_employees operation（openapi: GET /hrm/employees）
   * 注意：openapi schema 当前声明返回 Employee[]（非 Paginated），但实际后端返回
   * PaginatedResult。TODO: V72 A4-5 重生成 schema 后再切换为 TypedPaginatedResponse<Employee>。
   */
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<Employee>>> => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/employees${queryString}`);
  },

  /**
   * A4 绑定样板：get_employee operation（openapi: GET /hrm/employees/{id}）
   * schema: TypedApiResponse<Employee, 'get_employee'>
   */
  get: (id: string): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.get(`/employees/${id}`);
  },

  /**
   * A4 绑定样板：create_employee operation（openapi: POST /hrm/employees）
   * 注意：openapi schema 当前 requestBody?: never（后端 utoipa 缺失），
   * 保留 Partial<Employee> 并 TODO: V72 A4-5 后补 schema。
   */
  create: (data: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.post(
      '/employees',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * A4 绑定样板：update_employee operation（openapi: PUT /hrm/employees/{id}）
   * schema: TypedApiResponse<Employee, 'update_employee'>
   */
  update: (id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.put(`/employees/${id}`, data);
  },

  /**
   * A4 绑定样板：delete_employee operation（openapi: DELETE /hrm/employees/{id}）
   * schema: TypedApiResponse<string, 'delete_employee'>
   */
  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/employees/${id}`);
  },
};

export const roleApi: CrudOperations<Role> = createCrudApi<Role>('/roles');

export const positionApi: CrudOperations<Position> = createCrudApi<Position>('/positions');

export const employeePerformanceApi = {
  getReviews(
    employee_id: string
  ): Promise<ApiResponse<{ items: PerformanceReview[]; total: number }>> {
    return apiClient.hrm.get(`/employees/${employee_id}/performance-reviews`);
  },

  getGoals(employee_id: string): Promise<ApiResponse<{ items: PerformanceGoal[]; total: number }>> {
    return apiClient.hrm.get(`/employees/${employee_id}/performance-goals`);
  },
};

export default employeeApi;
