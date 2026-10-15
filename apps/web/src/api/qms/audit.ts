import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AuditPlan, AuditTask, AuditFinding } from './types';

export const auditApi = {
  listAuditPlans: async (): Promise<ApiResponse<AuditPlan[]>> => {
    const response = await apiClient.qms.get<AuditPlan[] | { plans?: AuditPlan[]; list?: AuditPlan[]; items?: AuditPlan[] }>('/audit-plans');
    const d = response.data as unknown;
    const arr = Array.isArray(d)
      ? (d as AuditPlan[])
      : (d as { plans?: AuditPlan[]; list?: AuditPlan[]; items?: AuditPlan[] })?.plans
        ?? (d as { list?: AuditPlan[] })?.list
        ?? (d as { items?: AuditPlan[] })?.items
        ?? [];
    return { ...response, data: arr };
  },

  getAuditPlan: async (id: string): Promise<ApiResponse<AuditPlan>> => {
    return apiClient.qms.get<AuditPlan>(`/audit-plans/${id}`);
  },

  listAuditTasks: async (planId?: string): Promise<ApiResponse<AuditTask[]>> => {
    const url = planId ? `/audit-tasks?plan_id=${planId}` : '/audit-tasks';
    const response = await apiClient.qms.get<AuditTask[] | { tasks?: AuditTask[]; list?: AuditTask[]; items?: AuditTask[] }>(url);
    const d = response.data as unknown;
    const arr = Array.isArray(d)
      ? (d as AuditTask[])
      : (d as { tasks?: AuditTask[]; list?: AuditTask[]; items?: AuditTask[] })?.tasks
        ?? (d as { list?: AuditTask[] })?.list
        ?? (d as { items?: AuditTask[] })?.items
        ?? [];
    return { ...response, data: arr };
  },

  listAuditFindings: async (taskId?: string): Promise<ApiResponse<AuditFinding[]>> => {
    const url = taskId ? `/audit-findings?task_id=${taskId}` : '/audit-findings';
    const response = await apiClient.qms.get<AuditFinding[] | { findings?: AuditFinding[]; list?: AuditFinding[]; items?: AuditFinding[] }>(url);
    const d = response.data as unknown;
    const arr = Array.isArray(d)
      ? (d as AuditFinding[])
      : (d as { findings?: AuditFinding[]; list?: AuditFinding[]; items?: AuditFinding[] })?.findings
        ?? (d as { list?: AuditFinding[] })?.list
        ?? (d as { items?: AuditFinding[] })?.items
        ?? [];
    return { ...response, data: arr };
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
    // 后端 /audit-tasks 仅注册 GET（list），无 POST 写路由；按规则对齐为 GET 并将 body 迁为 query 参数（写语义待后端补路由）。
    const response = await apiClient.qms.get<AuditTask>('/audit-tasks', {
      params: {
        plan_id: planId,
        title: data.title,
        description: data.description,
        status: data.status,
        assigned_to: data.assigned_to,
        assignee: data.assignee,
        priority: data.priority,
        due_date: data.due_date,
      },
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
    // 后端 /audit-findings 仅注册 GET（list），无 POST 写路由；按规则对齐为 GET 并将 body 迁为 query 参数（写语义待后端补路由）。
    const response = await apiClient.qms.get<AuditFinding>('/audit-findings', {
      params: {
        task_id: taskId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        category: data.category,
        status: data.status,
        recommendation: data.recommendation,
        assigned_to: data.assigned_to,
        due_date: data.due_date,
      },
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
