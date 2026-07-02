import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AuditPlan, AuditTask, AuditFinding } from './types';

export const auditApi = {
  listAuditPlans: async (): Promise<ApiResponse<AuditPlan[]>> => {
    const response = await apiClient.qms.get<{ plans?: AuditPlan[] }>('/audit-plans');
    return { ...response, data: response.data?.plans || [] };
  },

  listAuditTasks: async (planId?: string): Promise<ApiResponse<AuditTask[]>> => {
    const url = planId ? `/audit-tasks?plan_id=${planId}` : '/audit-tasks';
    const response = await apiClient.qms.get<{ tasks?: AuditTask[] }>(url);
    return { ...response, data: response.data?.tasks || [] };
  },

  listAuditFindings: async (taskId?: string): Promise<ApiResponse<AuditFinding[]>> => {
    const url = taskId ? `/audit-findings?task_id=${taskId}` : '/audit-findings';
    const response = await apiClient.qms.get<{ findings?: AuditFinding[] }>(url);
    return { ...response, data: response.data?.findings || [] };
  },

  createAuditPlan: async (
    data: Omit<AuditPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>('/audit-plans', data);
    return response;
  },

  startAuditPlan: async (id: string, operator?: string): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>(`/audit-plans/${id}/start`, {
      operator,
    });
    return response;
  },

  completeAuditPlan: async (id: string, operator?: string): Promise<ApiResponse<AuditPlan>> => {
    const response = await apiClient.qms.post<AuditPlan>(`/audit-plans/${id}/complete`, {
      operator,
    });
    return response;
  },

  createAuditTask: async (
    planId: string,
    data: Omit<
      AuditTask,
      'id' | 'plan_id' | 'task_no' | 'created_at' | 'updated_at' | 'findings_count'
    >
  ): Promise<ApiResponse<AuditTask>> => {
    const response = await apiClient.qms.post<AuditTask>('/audit-tasks', {
      plan_id: planId,
      title: data.title,
      description: data.description,
      status: data.status,
      assigned_to: data.assigned_to,
      assignee: data.assignee,
      priority: data.priority,
      due_date: data.due_date,
    });
    return response;
  },

  completeAuditTask: async (taskId: string): Promise<ApiResponse<AuditTask>> => {
    const response = await apiClient.qms.put<AuditTask>(`/audit-tasks/${taskId}/complete`, {
      status: 'completed',
    });
    return response;
  },

  createAuditFinding: async (
    taskId: string,
    data: Omit<
      AuditFinding,
      'id' | 'task_id' | 'finding_no' | 'created_at' | 'updated_at' | 'resolved_at'
    >
  ): Promise<ApiResponse<AuditFinding>> => {
    const response = await apiClient.qms.post<AuditFinding>('/audit-findings', {
      task_id: taskId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      status: data.status,
      recommendation: data.recommendation,
      assigned_to: data.assigned_to,
      due_date: data.due_date,
    });
    return response;
  },

  verifyAuditFinding: async (
    findingId: string,
    data: { result: string; verifier?: string; remark?: string }
  ): Promise<ApiResponse<AuditFinding>> => {
    const response = await apiClient.qms.post<AuditFinding>(
      `/audit-findings/${findingId}/verify`,
      data
    );
    return response;
  },
};
