import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityCheck,
  CreateQualityCheckRequest,
  QualityInspectionBackend,
  UpdateQualityInspectionRequestBackend,
  AssignInspectionRequestBackend,
  SubmitInspectionResultRequestBackend,
  AuditInspectionRequestBackend,
  InspectionResult,
  InspectionAudit,
  PaginatedResponse,
} from './types';
import { adaptInspectionToFrontend, adaptInspectionToBackend } from './adapters';

export const inspectionApi = {
  listChecks: async (): Promise<ApiResponse<QualityCheck[]>> => {
    const response =
      await apiClient.qms.get<PaginatedResponse<QualityInspectionBackend>>('/checks');
    const adaptedData = (response.data?.inspections || []).map(adaptInspectionToFrontend);
    return { ...response, data: adaptedData };
  },

  getCheck: async (id: string): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.get<QualityInspectionBackend>(`/checks/${id}`);
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  createCheck: async (data: CreateQualityCheckRequest): Promise<ApiResponse<QualityCheck>> => {
    const backendData = adaptInspectionToBackend(data);
    const response = await apiClient.qms.post<QualityInspectionBackend>('/checks', backendData);
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  updateCheck: async (
    id: string,
    data: CreateQualityCheckRequest
  ): Promise<ApiResponse<QualityCheck>> => {
    const backendData: UpdateQualityInspectionRequestBackend = {
      inspection_type: data.inspection_type,
      product_name: data.product_name,
      standard_id: data.standard_id,
      quantity: data.quantity,
    };
    const response = await apiClient.qms.put<QualityInspectionBackend>(
      `/checks/${id}`,
      backendData
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  deleteCheck: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/checks/${id}`);
  },

  assignCheck: async (
    id: string,
    data: AssignInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/checks/${id}/assign`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  submitCheckResult: async (
    id: string,
    data: SubmitInspectionResultRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/checks/${id}/submit`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  auditCheck: async (
    id: string,
    data: AuditInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/checks/${id}/audit`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  reworkCheck: async (
    id: string,
    data: AuditInspectionRequestBackend
  ): Promise<ApiResponse<QualityCheck>> => {
    const response = await apiClient.qms.post<QualityInspectionBackend>(
      `/checks/${id}/rework`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptInspectionToFrontend(response.data) : undefined,
    };
  },

  getCheckResults: async (id: string): Promise<ApiResponse<InspectionResult[]>> => {
    const response = await apiClient.qms.get<{ results?: InspectionResult[] }>(
      `/checks/${id}/results`
    );
    return { ...response, data: response.data?.results || [] };
  },

  getCheckAudits: async (id: string): Promise<ApiResponse<InspectionAudit[]>> => {
    const response = await apiClient.qms.get<{ audits?: InspectionAudit[] }>(
      `/checks/${id}/audits`
    );
    return { ...response, data: response.data?.audits || [] };
  },
};
