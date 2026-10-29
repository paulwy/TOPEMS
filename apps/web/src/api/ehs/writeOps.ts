import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 下线候选分流·批2（ehs 写端点补绑，2026-10-29）──
export const ehsWriteApi = {
  createHazardFactor: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-disease/factors', data ?? {}),
  updateHazardFactor: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.put('/occupational-disease/factors/{id}', data ?? {}),
  deleteHazardFactor: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.delete('/occupational-disease/factors/{id}'),
  createDetectionRecord: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-disease/detections', data ?? {}),
  deleteDetectionRecord: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.delete('/occupational-disease/detections/{id}'),
  createProtectionMeasure: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-disease/protection-measures', data ?? {}),
  updateProtectionMeasure: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.put('/occupational-disease/protection-measures/{id}', data ?? {}),
  deleteProtectionMeasure: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.delete('/occupational-disease/protection-measures/{id}'),
  createExamPlan: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-health/exam-plans', data ?? {}),
  createExamRecord: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.post('/occupational-health/exam-records', data ?? {}),
};