import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest } from './types';

export const testApi = {
  listTests: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    case_type?: string;
    priority?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      test_cases: TestCase[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/tests?${queryParams}` : '/tests';
    return apiClient.rd.get(url);
  },

  getTest: async (id: string): Promise<ApiResponse<TestCase>> => {
    return apiClient.rd.get(`/tests/${id}`);
  },

  createTest: async (data: CreateTestCaseRequest): Promise<ApiResponse<TestCase>> => {
    return apiClient.rd.post('/tests', data);
  },

  updateTest: async (id: string, data: UpdateTestCaseRequest): Promise<ApiResponse<TestCase>> => {
    return apiClient.rd.put(`/tests/${id}`, data);
  },

  deleteTest: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rd.delete(`/tests/${id}`);
  },
};
