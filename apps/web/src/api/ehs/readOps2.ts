import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 ehs 5 条（2026-10-29）──
export const ehsReadOps2 = {
  listHazardFactors: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/api/ehs/occupational-disease/factors'),
  listDetectionRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/api/ehs/occupational-disease/detections'),
  getDetectionRecord: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/api/ehs/occupational-disease/detections/{id}'),
  listProtectionMeasures: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/api/ehs/occupational-disease/protection-measures'),
  listAccidents: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ehs.get('/accidents'),
};