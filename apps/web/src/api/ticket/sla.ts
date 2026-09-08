/**
 * Ticket · SLA 策略与计算 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   GET    /tickets/{id}/sla
 *   POST   /tickets/{id}/sla
 *   GET    /tickets/sla-stats
 *   GET    /sla-policies
 *   POST   /sla-policies
 *   GET    /sla-policies/{id}
 *   PUT    /sla-policies/{id}
 *   DELETE /sla-policies/{id}
 */

import apiClient from '../client';
import type {
  TicketSlaInfo,
  TicketSlaStats,
  TicketSlaPolicy,
  CreateSlaPolicyRequest,
  UpdateSlaPolicyRequest,
  SlaEscalationEvent,
} from './types';

export const slaApi = {
  getTicketSla: async (id: string) => {
    return apiClient.ticket.get<{ data: TicketSlaInfo }>(`/tickets/${id}/sla`);
  },

  triggerSlaEscalation: async (id: string) => {
    return apiClient.ticket.post<{ data: SlaEscalationEvent[] }>(`/tickets/${id}/sla`, {});
  },

  getSlaStats: async () => {
    return apiClient.ticket.get<{ data: TicketSlaStats }>('/tickets/sla-stats');
  },

  listSlaPolicies: async () => {
    return apiClient.ticket.get<{ data: TicketSlaPolicy[] }>('/sla-policies');
  },

  getSlaPolicy: async (id: string) => {
    return apiClient.ticket.get<{ data: TicketSlaPolicy }>(`/sla-policies/${id}`);
  },

  createSlaPolicy: async (data: CreateSlaPolicyRequest) => {
    return apiClient.ticket.post<{ data: TicketSlaPolicy }>('/sla-policies', data);
  },

  updateSlaPolicy: async (id: string, data: UpdateSlaPolicyRequest) => {
    return apiClient.ticket.put<{ data: TicketSlaPolicy }>(`/sla-policies/${id}`, data);
  },

  deleteSlaPolicy: async (id: string) => {
    return apiClient.ticket.delete<{ data: { deleted: boolean } }>(`/sla-policies/${id}`);
  },

  getDefaultSlaPolicy: async () => {
    return apiClient.ticket.get<{ data: TicketSlaPolicy | null }>('/sla-policies/default');
  },

  listSlaPoliciesByType: async (ticketType?: string, severity?: string) => {
    const params: Record<string, string> = {};
    if (ticketType) params.ticket_type = ticketType;
    if (severity) params.severity = severity;
    return apiClient.ticket.get<{ data: TicketSlaPolicy[] }>('/sla-policies/match', { params });
  },

  getSlaEscalations: async (ticketId: string) => {
    return apiClient.ticket.get<{ data: SlaEscalationEvent[] }>(
      `/tickets/${ticketId}/sla/escalations`
    );
  },

  calculateSlaForTicket: async (ticketId: string) => {
    return apiClient.ticket.post<{ data: TicketSlaInfo }>(`/tickets/${ticketId}/sla/calculate`, {});
  },
};

export default slaApi;
