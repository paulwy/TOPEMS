/**
 * Ticket · 工单评论与活动 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   GET    /tickets/{id}/comments
 *   POST   /tickets/{id}/comments
 *   DELETE /tickets/{id}/comments/{comment_id}
 *   PUT    /tickets/{id}/comments/{comment_id}
 *   GET    /tickets/{id}/activities
 */

import apiClient from '../client';
import type { TicketComment, TicketActivity, AddCommentRequest } from './types';

export const commentApi = {
  listComments: async (ticketId: string) => {
    return apiClient.portal.get<{ data: TicketComment[] }>(`/tickets/${ticketId}/comments`);
  },

  addComment: async (ticketId: string, data: AddCommentRequest) => {
    return apiClient.portal.post<{ data: TicketComment }>(`/tickets/${ticketId}/comments`, data);
  },

  addPublicComment: async (ticketId: string, content: string) => {
    return apiClient.portal.post<{ data: TicketComment }>(`/tickets/${ticketId}/comments`, {
      content,
      is_internal: false,
    });
  },

  addInternalComment: async (ticketId: string, content: string) => {
    return apiClient.portal.post<{ data: TicketComment }>(`/tickets/${ticketId}/comments`, {
      content,
      is_internal: true,
    });
  },

  updateComment: async (ticketId: string, commentId: string, data: Partial<AddCommentRequest>) => {
    return apiClient.portal.put<{ data: TicketComment }>(
      `/tickets/${ticketId}/comments/${commentId}`,
      data
    );
  },

  deleteComment: async (ticketId: string, commentId: string) => {
    return apiClient.portal.delete<{ data: { deleted: boolean } }>(
      `/tickets/${ticketId}/comments/${commentId}`
    );
  },

  listActivities: async (ticketId: string) => {
    return apiClient.portal.get<{ data: TicketActivity[] }>(`/tickets/${ticketId}/activities`);
  },

  getActivity: async (ticketId: string, activityId: string) => {
    return apiClient.portal.get<{ data: TicketActivity }>(
      `/tickets/${ticketId}/activities/${activityId}`
    );
  },

  getActivityTimeline: async (ticketId: string) => {
    return apiClient.portal.get<{ data: TicketActivity[] }>(
      `/tickets/${ticketId}/activities/timeline`
    );
  },
};

export default commentApi;
