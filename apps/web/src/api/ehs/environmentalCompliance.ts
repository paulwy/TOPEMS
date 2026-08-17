import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from './types';

export interface EnvironmentalRegulation {
  id: string;
  reg_no: string;
  title: string;
  category: string;
  regulation_type?: string;
  issuing_authority?: string;
  issued_date?: string;
  effective_date?: string;
  expiry_date?: string;
  status: string;
  content?: string;
  applicability?: string;
  related_files?: string[];
  version?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceEvaluation {
  id: string;
  eval_no: string;
  title: string;
  eval_type: string;
  eval_period?: string;
  start_date?: string;
  end_date?: string;
  evaluator?: string;
  status: string;
  overall_result?: string;
  compliance_rate?: number;
  findings?: string;
  improvements?: string;
  evaluated_at?: string;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentMonitor {
  id: string;
  record_no: string;
  monitor_type: string;
  monitor_point: string;
  monitor_date?: string;
  monitor_agency?: string;
  monitor_method?: string;
  pollutant?: string;
  concentration?: string;
  unit?: string;
  standard_value?: string;
  standard_type?: string;
  result: string;
  flow_rate?: string;
  emission_rate?: string;
  status: string;
  remarks?: string;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DischargePermit {
  id: string;
  permit_no: string;
  permit_type: string;
  permit_name?: string;
  issuing_authority?: string;
  issued_date?: string;
  valid_from?: string;
  valid_to?: string;
  status: string;
  pollutant_list?: string[];
  discharge_standard?: string;
  total_amount_limit?: string;
  discharge_location?: string;
  holder?: string;
  attachments?: string[];
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentIncident {
  id: string;
  incident_no: string;
  title: string;
  incident_type: string;
  level?: string;
  location?: string;
  occurred_at?: string;
  reported_by?: string;
  reported_at?: string;
  description?: string;
  cause?: string;
  impact?: string;
  immediate_measures?: string;
  status: string;
  responsible_person?: string;
  investigation_result?: string;
  corrective_actions?: string;
  preventive_measures?: string;
  closed_at?: string;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceStatistics {
  total_regulations: number;
  active_regulations: number;
  total_evaluations: number;
  average_compliance_rate?: number;
  total_monitor_records: number;
  qualified_monitor_records: number;
  total_permits: number;
  expiring_permits: number;
  total_incidents: number;
  open_incidents: number;
  by_monitor_type: Record<string, unknown>[];
  by_incident_type: Record<string, unknown>[];
}

export interface RegulationListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  category?: string;
  year?: number;
}

export interface CreateRegulationRequest {
  title: string;
  category: string;
  regulation_type?: string;
  issuing_authority?: string;
  issued_date?: string;
  effective_date?: string;
  expiry_date?: string;
  content?: string;
  applicability?: string;
  version?: string;
  remarks?: string;
}

export interface UpdateRegulationRequest {
  title?: string;
  category?: string;
  regulation_type?: string;
  issuing_authority?: string;
  issued_date?: string;
  effective_date?: string;
  expiry_date?: string;
  status?: string;
  content?: string;
  applicability?: string;
  version?: string;
  remarks?: string;
}

export interface CreateEvaluationRequest {
  title: string;
  eval_type: string;
  eval_period?: string;
  start_date?: string;
  end_date?: string;
  evaluator?: string;
}

export interface UpdateEvaluationRequest {
  overall_result?: string;
  compliance_rate?: number;
  findings?: string;
  improvements?: string;
  status?: string;
}

export interface CreateMonitorRecordRequest {
  monitor_type: string;
  monitor_point: string;
  monitor_date?: string;
  monitor_agency?: string;
  monitor_method?: string;
  pollutant?: string;
  concentration?: string;
  unit?: string;
  standard_value?: string;
  standard_type?: string;
  result: string;
  flow_rate?: string;
  emission_rate?: string;
  remarks?: string;
}

export interface CreatePermitRequest {
  permit_type: string;
  permit_name?: string;
  issuing_authority?: string;
  issued_date?: string;
  valid_from?: string;
  valid_to?: string;
  pollutant_list?: string[];
  discharge_standard?: string;
  total_amount_limit?: string;
  discharge_location?: string;
  holder?: string;
  remarks?: string;
}

export interface UpdatePermitRequest {
  permit_name?: string;
  status?: string;
  valid_from?: string;
  valid_to?: string;
  pollutant_list?: string[];
  remarks?: string;
}

export interface CreateIncidentRequest {
  title: string;
  incident_type: string;
  level?: string;
  location?: string;
  occurred_at?: string;
  reported_by?: string;
  description?: string;
  immediate_measures?: string;
  responsible_person?: string;
}

export interface UpdateIncidentRequest {
  level?: string;
  status?: string;
  cause?: string;
  impact?: string;
  investigation_result?: string;
  corrective_actions?: string;
  preventive_measures?: string;
}

export const environmentalComplianceApi = {
  async listRegulations(
    params?: RegulationListQuery
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentalRegulation>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.year) qs.set('year', String(params.year));
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<EnvironmentalRegulation>>(
      `/environmental-compliance/regulations${s ? `?${s}` : ''}`
    );
  },

  async getRegulation(id: string): Promise<ApiResponse<EnvironmentalRegulation>> {
    return apiClient.ehs.get<EnvironmentalRegulation>(
      `/environmental-compliance/regulations/${id}`
    );
  },

  async createRegulation(
    data: CreateRegulationRequest
  ): Promise<ApiResponse<EnvironmentalRegulation>> {
    return apiClient.ehs.post<EnvironmentalRegulation>(
      '/environmental-compliance/regulations',
      data
    );
  },

  async updateRegulation(
    id: string,
    data: UpdateRegulationRequest
  ): Promise<ApiResponse<EnvironmentalRegulation>> {
    return apiClient.ehs.put<EnvironmentalRegulation>(
      `/environmental-compliance/regulations/${id}`,
      data
    );
  },

  async deleteRegulation(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/environmental-compliance/regulations/${id}`);
  },

  async listRegulationCategories(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return apiClient.ehs.get<Record<string, unknown>[]>(
      '/environmental-compliance/regulations/categories'
    );
  },

  async listEvaluations(): Promise<ApiResponse<PaginatedResponse<ComplianceEvaluation>>> {
    return apiClient.ehs.get<PaginatedResponse<ComplianceEvaluation>>(
      '/environmental-compliance/evaluations'
    );
  },

  async getEvaluation(id: string): Promise<ApiResponse<ComplianceEvaluation>> {
    return apiClient.ehs.get<ComplianceEvaluation>(`/environmental-compliance/evaluations/${id}`);
  },

  async createEvaluation(
    data: CreateEvaluationRequest
  ): Promise<ApiResponse<ComplianceEvaluation>> {
    return apiClient.ehs.post<ComplianceEvaluation>('/environmental-compliance/evaluations', data);
  },

  async updateEvaluation(
    id: string,
    data: UpdateEvaluationRequest
  ): Promise<ApiResponse<ComplianceEvaluation>> {
    return apiClient.ehs.put<ComplianceEvaluation>(
      `/environmental-compliance/evaluations/${id}`,
      data
    );
  },

  async deleteEvaluation(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/environmental-compliance/evaluations/${id}`);
  },

  async listMonitorRecords(): Promise<ApiResponse<PaginatedResponse<EnvironmentMonitor>>> {
    return apiClient.ehs.get<PaginatedResponse<EnvironmentMonitor>>(
      '/environmental-compliance/monitoring'
    );
  },

  async getMonitorRecord(id: string): Promise<ApiResponse<EnvironmentMonitor>> {
    return apiClient.ehs.get<EnvironmentMonitor>(`/environmental-compliance/monitoring/${id}`);
  },

  async createMonitorRecord(
    data: CreateMonitorRecordRequest
  ): Promise<ApiResponse<EnvironmentMonitor>> {
    return apiClient.ehs.post<EnvironmentMonitor>('/environmental-compliance/monitoring', data);
  },

  async deleteMonitorRecord(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/environmental-compliance/monitoring/${id}`);
  },

  async listMonitorTypes(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return apiClient.ehs.get<Record<string, unknown>[]>(
      '/environmental-compliance/monitoring/types'
    );
  },

  async listPermits(): Promise<ApiResponse<PaginatedResponse<DischargePermit>>> {
    return apiClient.ehs.get<PaginatedResponse<DischargePermit>>(
      '/environmental-compliance/permits'
    );
  },

  async getPermit(id: string): Promise<ApiResponse<DischargePermit>> {
    return apiClient.ehs.get<DischargePermit>(`/environmental-compliance/permits/${id}`);
  },

  async createPermit(data: CreatePermitRequest): Promise<ApiResponse<DischargePermit>> {
    return apiClient.ehs.post<DischargePermit>('/environmental-compliance/permits', data);
  },

  async updatePermit(id: string, data: UpdatePermitRequest): Promise<ApiResponse<DischargePermit>> {
    return apiClient.ehs.put<DischargePermit>(`/environmental-compliance/permits/${id}`, data);
  },

  async deletePermit(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/environmental-compliance/permits/${id}`);
  },

  async listIncidents(): Promise<ApiResponse<PaginatedResponse<EnvironmentIncident>>> {
    return apiClient.ehs.get<PaginatedResponse<EnvironmentIncident>>(
      '/environmental-compliance/incidents'
    );
  },

  async getIncident(id: string): Promise<ApiResponse<EnvironmentIncident>> {
    return apiClient.ehs.get<EnvironmentIncident>(`/environmental-compliance/incidents/${id}`);
  },

  async createIncident(data: CreateIncidentRequest): Promise<ApiResponse<EnvironmentIncident>> {
    return apiClient.ehs.post<EnvironmentIncident>('/environmental-compliance/incidents', data);
  },

  async updateIncident(
    id: string,
    data: UpdateIncidentRequest
  ): Promise<ApiResponse<EnvironmentIncident>> {
    return apiClient.ehs.put<EnvironmentIncident>(
      `/environmental-compliance/incidents/${id}`,
      data
    );
  },

  async deleteIncident(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/environmental-compliance/incidents/${id}`);
  },

  async getComplianceStatistics(): Promise<ApiResponse<ComplianceStatistics>> {
    return apiClient.ehs.get<ComplianceStatistics>('/environmental-compliance/statistics');
  },
};
