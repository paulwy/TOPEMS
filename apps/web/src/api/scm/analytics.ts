/**
 * SCM 分析聚合 API
 * 对接后端 /scm/analytics/* 路由
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

// ===== 类型定义 =====

export interface PurchaseTrendItem {
  date: string;
  count: number;
  amount: number;
}

export interface PurchaseStatusItem {
  status: string;
  count: number;
  percentage: number;
}

export interface SupplierRankingItem {
  supplier_id: string;
  supplier_name: string;
  order_count: number;
  total_amount: number;
}

// ===== API 函数 =====

/**
 * 获取采购趋势（最近7天）
 * GET /scm/analytics/purchase-trend
 */
export async function getPurchaseTrend(): Promise<ApiResponse<PurchaseTrendItem[]>> {
  return apiClient.scm.get('/analytics/purchase-trend');
}

/**
 * 获取采购状态分布
 * GET /scm/analytics/purchase-status
 */
export async function getPurchaseStatus(): Promise<ApiResponse<PurchaseStatusItem[]>> {
  return apiClient.scm.get('/analytics/purchase-status');
}

/**
 * 获取供应商采购排名
 * GET /scm/analytics/supplier-ranking
 */
export async function getSupplierRanking(): Promise<ApiResponse<SupplierRankingItem[]>> {
  return apiClient.scm.get('/analytics/supplier-ranking');
}

// ===== 统一导出 =====

export const scmAnalyticsApi = {
  getPurchaseTrend,
  getPurchaseStatus,
  getSupplierRanking,
};
