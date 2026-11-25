import apiClient from '../client';
import type { PaginationParams } from '../client';

// ==================== P2-11 剩余项：PDM 独立图纸实体 ====================

export interface PdmDrawing {
  id: string;
  drawing_no: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  drawing_type?: string | null;
  product_id?: string | null;
  version?: string;
  status?: string;
  file_path?: string | null;
  file_size?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DrawingListResponse {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
}

const BASE = '/drawings';

export const drawingApi = {
  list: (params: PaginationParams & { search?: string; status?: string; drawing_type?: string }) =>
    apiClient.pdm.get<DrawingListResponse>(BASE, { params }),
  get: (id: string) => apiClient.pdm.get<PdmDrawing>(`${BASE}/${id}`),
  create: (data: Record<string, unknown>) => apiClient.pdm.post<PdmDrawing>(BASE, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.pdm.put<PdmDrawing>(`${BASE}/${id}`, data),
  remove: (id: string) => apiClient.pdm.delete<string>(`${BASE}/${id}`),
};
