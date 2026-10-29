import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（ehs 写端点补绑，2026-10-29）
// 2026-10-30 B2：单数 occupational-disease 8 条清理（主封装 occupationalDisease.ts 已复数覆盖）──
export const ehsWriteApi = {
  createExamPlan: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-health/exam-plans', data ?? {}),
  createExamRecord: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-health/exam-records', data ?? {}),
};
