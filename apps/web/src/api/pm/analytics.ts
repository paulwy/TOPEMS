/**
 * PM 分析聚合 API
 * 对接后端 /pm/analytics/* 路由
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

// ===== 类型定义 =====

export interface ProjectTrendItem {
  date: string;
  count: number;
}

export interface ProjectStatusItem {
  status: string;
  count: number;
  percentage: number;
}

// ===== API 函数 =====

/**
 * 获取项目创建趋势（最近7天）
 * GET /pm/analytics/project-trend
 */
export async function getProjectTrend(): Promise<ApiResponse<ProjectTrendItem[]>> {
  return apiClient.pm.get('/analytics/project-trend');
}

/**
 * 获取项目状态分布
 * GET /pm/analytics/project-status
 */
export async function getProjectStatus(): Promise<ApiResponse<ProjectStatusItem[]>> {
  return apiClient.pm.get('/analytics/project-status');
}

// ===== 统一导出 =====

export const pmAnalyticsApi = {
  getProjectTrend,
  getProjectStatus,
};
