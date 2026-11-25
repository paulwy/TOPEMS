import apiClient from '../client';
import type { PaginationParams } from '../client';

// ==================== LIMS 检验项目（analyte） ====================

export interface Analyte {
  id: string;
  analyte_code: string;
  analyte_name: string;
  category?: string | null;
  unit?: string | null;
  method_reference?: string | null;
  limit_value?: string | null;
  accuracy?: string | null;
  status: string;
  description?: string | null;
}

export interface CreateAnalyteRequest {
  analyte_code: string;
  analyte_name: string;
  category?: string;
  unit?: string;
  method_reference?: string;
  limit_value?: string;
  accuracy?: string;
  status?: string;
  description?: string;
}

export interface UpdateAnalyteRequest {
  analyte_name?: string;
  category?: string;
  unit?: string;
  method_reference?: string;
  limit_value?: string;
  accuracy?: string;
  status?: string;
  description?: string;
}

export interface AnalyteListResponse {
  items: Analyte[];
  total: number;
  page: number;
  page_size: number;
}

export const analyteApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.lims.get<AnalyteListResponse>('/analytes', { params }),
  get: (id: string) => apiClient.lims.get<Analyte>(`/analytes/${id}`),
  create: (data: CreateAnalyteRequest) => apiClient.lims.post<{ id: string }>('/analytes', data),
  update: (id: string, data: UpdateAnalyteRequest) =>
    apiClient.lims.put<{ id: string }>(`/analytes/${id}`, data),
  remove: (id: string) => apiClient.lims.delete<string>(`/analytes/${id}`),
};
