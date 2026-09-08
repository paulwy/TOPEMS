/**
 * Ticket · 工单流转与自动化 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   GET    /tickets/{id}/transitions
 *   POST   /tickets/{id}/transitions
 *   POST   /tickets/{id}/transition
 *   GET    /workflows
 *   POST   /workflows
 *   GET    /workflows/{id}
 *   PUT    /workflows/{id}
 *   DELETE /workflows/{id}
 *   GET    /workflows/{id}/transitions
 *   POST   /workflows/{id}/transitions
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Ticket } from './types';

export interface TicketTransition {
  id: string;
  ticket_id: string;
  tenant_id: string;
  from_status: string;
  to_status: string;
  action: string;
  performed_by?: string;
  reason?: string;
  created_at: string;
}

export interface TicketWorkflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  ticket_type: string;
  is_active: boolean;
  initial_status: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStatus {
  name: string;
  display_name: string;
  color?: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  sla_hours?: number;
}

export interface WorkflowTransition {
  id: string;
  from_status: string;
  to_status: string;
  action: string;
  role_required?: string;
  auto_assign?: string;
  sla_minutes?: number;
  is_conditional?: boolean;
  condition_expression?: string;
}

export interface CreateTicketTransitionRequest {
  action: string;
  to_status: string;
  reason?: string;
  assignee_id?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  ticket_type: string;
  initial_status: string;
  statuses: WorkflowStatus[];
  transitions: Omit<WorkflowTransition, 'id'>[];
}

export const workflowApi = {
  // ==================== 工单流转 ====================

  listTransitions: async (ticketId: string): Promise<ApiResponse<TicketTransition[]>> => {
    return apiClient.ticket.get(`/tickets/${ticketId}/transitions`);
  },

  performTransition: async (
    ticketId: string,
    data: CreateTicketTransitionRequest
  ): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/transition`, data);
  },

  approveTicket: async (ticketId: string, comment?: string): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/transition`, {
      action: 'approve',
      to_status: 'in_progress',
      reason: comment,
    });
  },

  rejectTicket: async (ticketId: string, reason: string): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/transition`, {
      action: 'reject',
      to_status: 'closed',
      reason,
    });
  },

  escalateTicket: async (ticketId: string, reason?: string): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/transition`, {
      action: 'escalate',
      to_status: 'escalated',
      reason,
    });
  },

  reassignTicket: async (
    ticketId: string,
    assigneeId: string,
    reason?: string
  ): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/transition`, {
      action: 'reassign',
      to_status: 'pending',
      assignee_id: assigneeId,
      reason,
    });
  },

  // ==================== 工作流管理 ====================

  listWorkflows: async (ticketType?: string): Promise<ApiResponse<TicketWorkflow[]>> => {
    const params: Record<string, string> = {};
    if (ticketType) params.ticket_type = ticketType;
    return apiClient.ticket.get('/workflows', { params });
  },

  getWorkflow: async (id: string): Promise<ApiResponse<TicketWorkflow>> => {
    return apiClient.ticket.get(`/workflows/${id}`);
  },

  createWorkflow: async (data: CreateWorkflowRequest): Promise<ApiResponse<TicketWorkflow>> => {
    return apiClient.ticket.post('/workflows', data);
  },

  updateWorkflow: async (
    id: string,
    data: Partial<CreateWorkflowRequest>
  ): Promise<ApiResponse<TicketWorkflow>> => {
    return apiClient.ticket.put(`/workflows/${id}`, data);
  },

  deleteWorkflow: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.ticket.delete(`/workflows/${id}`);
  },

  listWorkflowTransitions: async (
    workflowId: string
  ): Promise<ApiResponse<WorkflowTransition[]>> => {
    return apiClient.ticket.get(`/workflows/${workflowId}/transitions`);
  },

  addWorkflowTransition: async (
    workflowId: string,
    transition: Omit<WorkflowTransition, 'id'>
  ): Promise<ApiResponse<WorkflowTransition>> => {
    return apiClient.ticket.post(`/workflows/${workflowId}/transitions`, transition);
  },

  getWorkflowForTicketType: async (
    ticketType: string
  ): Promise<ApiResponse<TicketWorkflow | null>> => {
    return apiClient.ticket.get('/workflows/match', {
      params: { ticket_type: ticketType },
    });
  },

  // ==================== 自动化规则 ====================

  listAutomationRules: async (): Promise<
    ApiResponse<
      Array<{ id: string; name: string; trigger: string; action: string; is_active: boolean }>
    >
  > => {
    return apiClient.ticket.get('/workflows/automation-rules');
  },

  toggleAutomationRule: async (id: string, isActive: boolean): Promise<ApiResponse<void>> => {
    return apiClient.ticket.put(`/workflows/automation-rules/${id}/toggle`, {
      is_active: isActive,
    });
  },
};

export default workflowApi;
