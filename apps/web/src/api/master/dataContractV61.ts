import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ContractType = 'schema' | 'sla' | 'security' | 'compliance' | 'data_quality';
export type ContractStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type BindingStatus = 'bound' | 'unbound' | 'conflict';

export interface DataContractV61 {
  id: string;
  name: string;
  type: ContractType;
  version: string;
  source_system: string;
  target_system: string;
  owner?: string;
  description?: string;
  schema: Record<string, unknown>;
  sla?: SlaDefinition;
  security?: SecurityDefinition;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  deprecated_at?: string;
}

export interface SlaDefinition {
  availability: number;
  latency_p99_ms: number;
  error_rate_threshold: number;
  update_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export interface SecurityDefinition {
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryption_required: boolean;
  pii_fields: string[];
  retention_days: number;
}

export interface ContractBinding {
  id: string;
  contract_id: string;
  entity_type: string;
  entity_id: string;
  direction: 'producer' | 'consumer';
  status: BindingStatus;
  bound_at: string;
  unbound_at?: string;
}

export interface ContractViolation {
  id: string;
  contract_id: string;
  type: 'schema_drift' | 'sla_breach' | 'security_violation' | 'quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved_at?: string;
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
}

export interface ContractVersion {
  version: string;
  status: ContractStatus;
  changelog: string;
  created_at: string;
  created_by?: string;
  is_latest: boolean;
}

export interface ContractDashboardV61 {
  total_contracts: number;
  active: number;
  deprecated: number;
  by_type: Array<{ type: ContractType; count: number }>;
  by_status: Array<{ status: ContractStatus; count: number }>;
  violations_open: number;
  by_severity: Array<{ severity: ContractViolation['severity']; count: number }>;
  producers_count: number;
  consumers_count: number;
}

// ============ Request Types ============

export interface CreateContractRequest {
  name: string;
  type: ContractType;
  source_system: string;
  target_system: string;
  owner?: string;
  description?: string;
  schema: Record<string, unknown>;
  sla?: SlaDefinition;
  security?: SecurityDefinition;
}

export interface UpdateContractRequest {
  name?: string;
  description?: string;
  schema?: Record<string, unknown>;
  sla?: SlaDefinition;
  security?: SecurityDefinition;
}

export interface PublishContractRequest {
  changelog: string;
  target_version?: string;
}

export interface DeprecateContractRequest {
  reason: string;
  replacement_contract_id?: string;
}

export interface BindEntityRequest {
  entity_type: string;
  entity_id: string;
  direction: 'producer' | 'consumer';
}

export interface ValidateContractRequest {
  sample_payload?: Record<string, unknown>;
  validate_schema?: boolean;
  validate_sla?: boolean;
  validate_security?: boolean;
}

export interface GenerateContractRequest {
  source_system: string;
  target_system: string;
  entity_type: string;
  sample_data?: Record<string, unknown>[];
}

// ============ API ============

export const dataContractApiV61 = {
  // ===== 契约管理 =====
  async createContract(data: CreateContractRequest): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>('/mdm-v61/contracts', data);
  },

  async getContract(id: string): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.get<DataContractV61>(`/mdm-v61/contracts/${id}`);
  },

  async listContract(params?: {
    type?: ContractType;
    status?: ContractStatus;
    source_system?: string;
    target_system?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DataContractV61[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.source_system) qs.set('source_system', params.source_system);
    if (params?.target_system) qs.set('target_system', params.target_system);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DataContractV61[]; total: number }>(`/mdm-v61/contracts${s ? `?${s}` : ''}`);
  },

  async updateContract(id: string, data: UpdateContractRequest): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.put<DataContractV61>(`/mdm-v61/contracts/${id}`, data);
  },

  async deleteContract(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v61/contracts/${id}`);
  },

  async publishContract(id: string, data: PublishContractRequest): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>(`/mdm-v61/contracts/${id}/publish`, data);
  },

  async deprecateContract(id: string, data: DeprecateContractRequest): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>(`/mdm-v61/contracts/${id}/deprecate`, data);
  },

  async restoreContract(id: string): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>(`/mdm-v61/contracts/${id}/restore`, {});
  },

  // ===== 版本管理 =====
  async listVersions(id: string): Promise<ApiResponse<ContractVersion[]>> {
    return apiClient.master.get<ContractVersion[]>(`/mdm-v61/contracts/${id}/versions`);
  },

  async getVersion(id: string, version: string): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.get<DataContractV61>(`/mdm-v61/contracts/${id}/versions/${version}`);
  },

  async rollbackVersion(id: string, version: string): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>(`/mdm-v61/contracts/${id}/rollback`, { version });
  },

  async diffVersions(id: string, from: string, to: string): Promise<ApiResponse<{ added: string[]; removed: string[]; modified: string[] }>> {
    const qs = new URLSearchParams();
    qs.set('from', from);
    qs.set('to', to);
    return apiClient.master.get<{ added: string[]; removed: string[]; modified: string[] }>(`/mdm-v61/contracts/${id}/diff?${qs.toString()}`);
  },

  // ===== 实体绑定 =====
  async listBindings(contractId: string): Promise<ApiResponse<ContractBinding[]>> {
    return apiClient.master.get<ContractBinding[]>(`/mdm-v61/contracts/${contractId}/bindings`);
  },

  async bindEntity(contractId: string, data: BindEntityRequest): Promise<ApiResponse<ContractBinding>> {
    return apiClient.master.post<ContractBinding>(`/mdm-v61/contracts/${contractId}/bind`, data);
  },

  async unbindEntity(contractId: string, bindingId: string): Promise<ApiResponse<{ unbound: boolean }>> {
    return apiClient.master.post<{ unbound: boolean }>(`/mdm-v61/contracts/${contractId}/unbind/${bindingId}`, {});
  },

  async listEntityBindings(entityType: string, entityId: string): Promise<ApiResponse<ContractBinding[]>> {
    return apiClient.master.get<ContractBinding[]>(`/mdm-v61/entities/${entityType}/${entityId}/contracts`);
  },

  // ===== 校验与监控 =====
  async validateContract(id: string, data?: ValidateContractRequest): Promise<ApiResponse<{ valid: boolean; issues: Array<{ field: string; message: string; severity: 'error' | 'warning' }> }>> {
    return apiClient.master.post<{ valid: boolean; issues: Array<{ field: string; message: string; severity: 'error' | 'warning' }> }>(`/mdm-v61/contracts/${id}/validate`, data || {});
  },

  async testContract(id: string, payload: Record<string, unknown>): Promise<ApiResponse<{ passed: boolean; latency_ms: number; errors: string[] }>> {
    return apiClient.master.post<{ passed: boolean; latency_ms: number; errors: string[] }>(`/mdm-v61/contracts/${id}/test`, payload);
  },

  async listViolations(params?: {
    contract_id?: string;
    severity?: ContractViolation['severity'];
    status?: ContractViolation['status'];
  }): Promise<ApiResponse<ContractViolation[]>> {
    const qs = new URLSearchParams();
    if (params?.contract_id) qs.set('contract_id', params.contract_id);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<ContractViolation[]>(`/mdm-v61/violations${s ? `?${s}` : ''}`);
  },

  async resolveViolation(id: string, data: { resolution: string }): Promise<ApiResponse<ContractViolation>> {
    return apiClient.master.post<ContractViolation>(`/mdm-v61/violations/${id}/resolve`, data);
  },

  // ===== 智能生成与仪表盘 =====
  async generateContract(data: GenerateContractRequest): Promise<ApiResponse<DataContractV61>> {
    return apiClient.master.post<DataContractV61>('/mdm-v61/contracts/generate', data);
  },

  async getDashboard(): Promise<ApiResponse<ContractDashboardV61>> {
    return apiClient.master.get<ContractDashboardV61>('/mdm-v61/dashboard');
  },

  async listSystemContracts(system: string): Promise<ApiResponse<DataContractV61[]>> {
    return apiClient.master.get<DataContractV61[]>(`/mdm-v61/systems/${system}/contracts`);
  },
};

export default dataContractApiV61;
