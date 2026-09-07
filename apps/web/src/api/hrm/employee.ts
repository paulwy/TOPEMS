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
import { toOpenApiRequestBody } from '@topems/shared-types';

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
   * openapi schema 已修正为 ListResponse<Employee>（2026-09-07），与实际分页返回一致。
   */
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<Employee>>> => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/employees${queryString}`);
  },

  /**
   * A4 绑定样板：get_employee operation（openapi: GET /hrm/employees/{id}）
   * schema: TypedApiResponse<Employee>
   */
  get: (id: string): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.get(`/employees/${id}`);
  },

  /**
   * A4 绑定样板：create_employee operation（openapi: POST /hrm/employees）
   * 后端 utoipa 已声明 request_body = CreateEmployeeRequest（字段完整）；
   * 保留 Partial<Employee> 以兼容可选字段输入。
   */
  create: (data: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.post('/employees', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  /**
   * A4 绑定样板：update_employee operation（openapi: PUT /hrm/employees/{id}）
   * schema: TypedApiResponse<Employee>
   */
  update: (id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    return apiClient.hrm.put(`/employees/${id}`, data);
  },

  /**
   * A4 绑定样板：delete_employee operation（openapi: DELETE /hrm/employees/{id}）
   * schema: TypedApiResponse<string>
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
