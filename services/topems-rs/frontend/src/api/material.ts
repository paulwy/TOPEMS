import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface MaterialTest {
  id: string;
  name: string;
  code: string;
  project_id: string;
  project_name: string;
  experiment_id: string;
  experiment_name: string;
  material_name: string;
  material_code: string;
  test_type: string;
  test_method: string;
  test_result: string;
  conclusion: string;
  tester: string;
  test_date: string;
  created_at: string;
}

export interface MaterialTestCreateRequest {
  name: string;
  code: string;
  project_id: string;
  experiment_id: string;
  material_name: string;
  material_code: string;
  test_type: string;
  test_method: string;
  test_result: string;
  conclusion: string;
  tester: string;
  test_date: string;
}

export interface MaterialTestListParams {
  page?: number;
  page_size?: number;
  search?: string;
  project_id?: string;
  experiment_id?: string;
}

export const materialTestApi = {
  list: async (params: MaterialTestListParams = {}): Promise<ApiResponse<PaginatedResponse<MaterialTest>>> => {
    const response = await apiClient.get('/api/material-tests', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<MaterialTest>> => {
    const response = await apiClient.get(`/api/material-tests/${id}`);
    return response.data;
  },

  create: async (data: MaterialTestCreateRequest): Promise<ApiResponse<MaterialTest>> => {
    const response = await apiClient.post('/api/material-tests', data);
    return response.data;
  },

  update: async (id: string, data: Partial<MaterialTestCreateRequest>): Promise<ApiResponse<MaterialTest>> => {
    const response = await apiClient.put(`/api/material-tests/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/api/material-tests/${id}`);
    return response.data;
  },

  getByProject: async (projectId: string): Promise<ApiResponse<MaterialTest[]>> => {
    const response = await apiClient.get(`/api/material-tests/project/${projectId}`);
    return response.data;
  },

  getByExperiment: async (experimentId: string): Promise<ApiResponse<MaterialTest[]>> => {
    const response = await apiClient.get(`/api/material-tests/experiment/${experimentId}`);
    return response.data;
  },
};