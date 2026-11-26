import apiClient from '../client';
import type { ApiResponse } from '../client';
// 2026-11-26：此文件是 v74「端点绑定」占位（页面未接入）。动作型接口按后端实际方法对齐为 POST，
// 之前用 GET 只会拿到 405。详见 docs/dev/api-contract-audit-20261126.md

// ── v74 待确认-疑似接入 ai 6 条（2026-10-29）──
export const aiReadOps2 = {
  summarizeVideo: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.post('/multimodal/video/summary', data ?? {}),
  listConversations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dify/conversations'),
  listMessages: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dify/messages'),
  listConnectors: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/connectors'),
  listAdminFaqs: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ai.get('/dsh/copilot/admin/faqs'),
};
