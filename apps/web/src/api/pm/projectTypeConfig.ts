import apiClient from '../client';
import type { PaginationParams } from '../client';

// ==================== P2-11 剩余项：PM 项目类型模板 ====================

export interface ProjectTypeConfig {
  id: string;
  type_code: string;
  type_name: string;
  name_en?: string | null;
  description?: string | null;
  default_phases?: string | null;
  default_milestones?: string | null;
  default_workflow?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTypeListResponse {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
}

const BASE = '/project-types';

export const projectTypeConfigApi = {
  list: (params: PaginationParams & { search?: string; is_active?: boolean }) =>
    apiClient.pm.get<ProjectTypeListResponse>(BASE, { params }),
  get: (id: string) => apiClient.pm.get<ProjectTypeConfig>(`${BASE}/${id}`),
  create: (data: Record<string, unknown>) => apiClient.pm.post<ProjectTypeConfig>(BASE, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.pm.put<ProjectTypeConfig>(`${BASE}/${id}`, data),
  remove: (id: string) => apiClient.pm.delete<string>(`${BASE}/${id}`),
};
