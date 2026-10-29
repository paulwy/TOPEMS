import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 ai 6 条（2026-10-29）──
export const aiReadOps2 = {
  summarizeVideo: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/multimodal/video/summary'),
  listConversations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/api/ai/dify/conversations'),
  listMessages: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/api/ai/dify/messages'),
  listConnectors: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/api/ai/connectors'),
  listAdminFaqs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dsh/copilot/admin/faqs'),
  listForms: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/api/core/ai-form/forms'),
};