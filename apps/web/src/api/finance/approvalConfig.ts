import { apiClient } from '../client';
import type { ApiResponse } from '../../types/finance';

export interface ApprovalNode {
  id: string;
  configId: string;
  nodeLevel: number;
  nodeName: string;
  approverType: string;
  approverRole?: string;
  approverUsers?: string[];
  approvalType: string;
  timeoutHours?: number;
  notifyUsers?: string[];
  conditions?: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalConfig {
  id: string;
  name: string;
  description?: string;
  amountThreshold: number;
  maxAmount?: number;
  workflowId?: string;
  approvalLevels: number;
  priority: number;
  isActive: boolean;
  nodes?: ApprovalNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateApprovalConfigRequest {
  name: string;
  description?: string;
  amountThreshold: number;
  maxAmount?: number;
  workflowId?: string;
  approvalLevels: number;
  priority: number;
  isActive?: boolean;
  nodes?: ApprovalNode[];
}

export const approvalConfigApi = {
  list: (): Promise<ApiResponse<ApprovalConfig[]>> => {
    return apiClient.finance.get('/approval-configs');
  },

  get: (id: string): Promise<ApiResponse<ApprovalConfig>> => {
    return apiClient.finance.get(`/approval-configs/${id}`);
  },

  create: (data: CreateApprovalConfigRequest): Promise<ApiResponse<ApprovalConfig>> => {
    return apiClient.finance.post('/approval-configs', data);
  },

  update: (id: string, data: CreateApprovalConfigRequest): Promise<ApiResponse<ApprovalConfig>> => {
    return apiClient.finance.put(`/approval-configs/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/approval-configs/${id}`);
  },
};