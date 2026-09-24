/**
 * File · 安全扫描与病毒检测 API 绑定
 *
 * 后端: file 服务 /scan/*
 * 路由:
 *   POST   /scan/{file_id}
 *   GET    /scan/{task_id}
 *   GET    /scan/{file_id}/history
 *   POST   /scan/batch
 *   GET    /scan/rules
 *   POST   /scan/rules
 *   PUT    /scan/rules/{id}
 *   DELETE /scan/rules/{id}
 *   GET    /scan/quarantine
 *   DELETE /scan/quarantine/{id}
 *   POST   /scan/quarantine/{id}/release
 *   GET    /scan/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'infected' | 'error' | 'timeout';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ScanResult {
  id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  status: ScanStatus;
  scanner: string;
  engine_version: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  is_clean: boolean;
  threats: Threat[];
  risk_score: number;
  actions_taken: Array<{ action: string; result: string }>;
  created_at: string;
}

export interface Threat {
  id: string;
  name: string;
  category: string;
  severity: ThreatSeverity;
  description?: string;
  location?: string;
  hash?: string;
}

export interface ScanRule {
  id: string;
  name: string;
  pattern: string;
  pattern_type: 'regex' | 'hash' | 'signature' | 'heuristic';
  severity: ThreatSeverity;
  category: string;
  action: 'block' | 'quarantine' | 'alert';
  is_active: boolean;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateScanRuleRequest {
  name: string;
  pattern: string;
  pattern_type: ScanRule['pattern_type'];
  severity: ThreatSeverity;
  category: string;
  action: 'block' | 'quarantine' | 'alert';
  is_active?: boolean;
}

export interface QuarantineItem {
  id: string;
  file_id: string;
  file_name: string;
  reason: string;
  threat_id?: string;
  quarantined_by: string;
  quarantined_at: string;
  expires_at?: string;
  status: 'held' | 'released' | 'destroyed';
}

export interface ScanStats {
  total_scans: number;
  clean_count: number;
  infected_count: number;
  error_count: number;
  avg_scan_duration_ms: number;
  threats_detected: Array<{ name: string; count: number; severity: string }>;
  last_scan_at?: string;
}

export const fileScanApi = {
  // ==================== 扫描执行 ====================

  scanFile: async (
    fileId: string,
    data?: { scan_types?: string[]; priority?: 'low' | 'normal' | 'high' }
  ): Promise<ApiResponse<ScanResult>> => {
    return apiClient.file.post(`/scan/${fileId}`, data || {});
  },

  getScanResult: async (taskId: string): Promise<ApiResponse<ScanResult>> => {
    return apiClient.file.get(`/scan/${taskId}`);
  },

  listFileScanHistory: async (
    fileId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<ScanResult>>> => {
    return apiClient.file.get(`/scan/${fileId}/history`, { params });
  },

  batchScan: async (data: {
    file_ids: string[];
    scan_types?: string[];
  }): Promise<ApiResponse<{ task_id: string; queued: number }>> => {
    return apiClient.file.post('/scan/batch', data);
  },

  // ==================== 扫描规则 ====================

  listScanRules: async (params?: {
    severity?: ThreatSeverity;
    category?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<ScanRule[]>> => {
    return apiClient.file.get('/scan/rules', { params });
  },

  createScanRule: async (data: CreateScanRuleRequest): Promise<ApiResponse<ScanRule>> => {
    return apiClient.file.post('/scan/rules', data);
  },

  updateScanRule: async (
    id: string,
    data: Partial<CreateScanRuleRequest>
  ): Promise<ApiResponse<ScanRule>> => {
    return apiClient.file.put(`/scan/rules/${id}`, data);
  },

  deleteScanRule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.file.delete(`/scan/rules/${id}`);
  },

  // ==================== 隔离区 ====================

  listQuarantine: async (params?: {
    status?: QuarantineItem['status'];
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<QuarantineItem>>> => {
    return apiClient.file.get('/scan/quarantine', { params });
  },

  releaseFromQuarantine: async (id: string): Promise<ApiResponse<QuarantineItem>> => {
    return apiClient.file.post(`/scan/quarantine/${id}/release`);
  },

  destroyQuarantine: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.file.delete(`/scan/quarantine/${id}`);
  },

  // ==================== 统计 ====================

  getScanStats: async (params?: {
    period?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<ScanStats>> => {
    return apiClient.file.get('/scan/stats', { params });
  },
};

export default fileScanApi;
