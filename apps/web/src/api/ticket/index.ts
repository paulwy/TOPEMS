import { apiClient } from '../client';

export interface Ticket {
  id: string;
  ticket_no: string;
  tenant_id: string;
  title: string;
  description?: string;
  ticket_type: string;
  severity: string;
  status: string;
  source_service: string;
  source_business_id?: string;
  assignee_id?: string;
  reporter_id?: string;
  sla_due_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  from_value?: string;
  to_value?: string;
  created_at: string;
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  page_size: number;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved: number;
  closed: number;
  sla_breached: number;
  bySeverity: Array<{ severity: string; count: number }>;
  byType: Array<{ ticket_type: string; count: number }>;
  by_source: Array<{ source_service: string; count: number }>;
}

export interface CreateTicketRequest {
  title: string;
  description?: string;
  ticket_type: string;
  severity?: string;
  source_service: string;
  source_business_id?: string;
  assignee_id?: string;
  sla_hours?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assignee_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TicketQuery {
  status?: string;
  severity?: string;
  ticket_type?: string;
  assignee_id?: string;
  reporter_id?: string;
  source_service?: string;
  sla_breached?: boolean;
  page?: number;
  page_size?: number;
}

export interface TicketSlaInfo {
  sla_due_at?: string;
  response_due_at?: string;
  is_breached: boolean;
  response_breached: boolean;
  time_remaining_minutes?: number;
  response_time_remaining_minutes?: number;
  current_escalation_level: number;
  escalation_history: SlaEscalationEvent[];
  policy_name?: string;
  resolution_hours?: number;
  response_hours?: number;
}

export interface SlaEscalationEvent {
  id: string;
  ticket_id: string;
  tenant_id: string;
  level: number;
  escalation_time: string;
  escalated_to?: string;
  reason?: string;
  created_at: string;
}

export interface TicketSlaPolicy {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  ticket_type?: string;
  severity?: string;
  response_hours: number;
  resolution_hours: number;
  escalation_levels: number;
  escalation_hours_1?: number;
  escalation_hours_2?: number;
  escalation_hours_3?: number;
  working_hours_only: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  weekend_excluded: boolean;
  is_default: boolean;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketSlaStats {
  total: number;
  on_time: number;
  breached: number;
  breach_rate: number;
  avg_resolution_minutes?: number;
  avg_response_minutes?: number;
  bySeverity: Array<{ severity: string; total: number; breached: number; breach_rate: number }>;
  byType: Array<{ ticket_type: string; total: number; breached: number; breach_rate: number }>;
  breach_trend: Array<{ date: string; total: number; breached: number }>;
}

export interface CreateSlaPolicyRequest {
  name: string;
  description?: string;
  ticket_type?: string;
  severity?: string;
  response_hours: number;
  resolution_hours: number;
  escalation_levels: number;
  escalation_hours_1?: number;
  escalation_hours_2?: number;
  escalation_hours_3?: number;
  working_hours_only?: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  weekend_excluded?: boolean;
  is_default?: boolean;
}

export interface UpdateSlaPolicyRequest {
  name?: string;
  description?: string;
  response_hours?: number;
  resolution_hours?: number;
  escalation_levels?: number;
  escalation_hours_1?: number;
  escalation_hours_2?: number;
  escalation_hours_3?: number;
  working_hours_only?: boolean;
  weekend_excluded?: boolean;
  is_default?: boolean;
  isActive?: boolean;
}

// 使用 Portal BFF 代理（推荐）
const portal = apiClient.portal;

export const ticketApi = {
  listTickets: (query?: TicketQuery) =>
    portal.get<{ data: TicketListResponse }>('/tickets', { params: query }),

  getTicket: (id: string) => portal.get<{ data: Ticket }>(`/tickets/${id}`),

  createTicket: (data: CreateTicketRequest) => portal.post<{ data: Ticket }>('/tickets', data),

  updateTicket: (id: string, data: UpdateTicketRequest) =>
    portal.put<{ data: Ticket }>(`/tickets/${id}`, data),

  getComments: (id: string) => portal.get<{ data: TicketComment[] }>(`/tickets/${id}/comments`),

  addComment: (id: string, content: string, isInternal?: boolean) =>
    portal.post<{ data: TicketComment }>(`/tickets/${id}/comments`, {
      content,
      is_internal: isInternal ?? false,
    }),

  getStats: () => portal.get<{ data: TicketStats }>('/tickets/stats'),

  getActivities: (id: string) =>
    portal.get<{ data: TicketActivity[] }>(`/tickets/${id}/activities`),

  getTicketSla: (id: string) => portal.get<{ data: TicketSlaInfo }>(`/tickets/${id}/sla`),

  triggerSlaEscalation: (id: string) =>
    portal.post<{ data: SlaEscalationEvent[] }>(`/tickets/${id}/sla`, {}),

  getSlaStats: () => portal.get<{ data: TicketSlaStats }>('/tickets/sla-stats'),

  listSlaPolicies: () => portal.get<{ data: TicketSlaPolicy[] }>('/sla-policies'),

  getSlaPolicy: (id: string) => portal.get<{ data: TicketSlaPolicy }>(`/sla-policies/${id}`),

  createSlaPolicy: (data: CreateSlaPolicyRequest) =>
    portal.post<{ data: TicketSlaPolicy }>('/sla-policies', data),

  updateSlaPolicy: (id: string, data: UpdateSlaPolicyRequest) =>
    portal.put<{ data: TicketSlaPolicy }>(`/sla-policies/${id}`, data),

  deleteSlaPolicy: (id: string) =>
    portal.delete<{ data: { deleted: boolean } }>(`/sla-policies/${id}`),
};

export default ticketApi;
