import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * V19.0 Stub: BI 数据分析（销售/区域/透视）
 * 后端尚未实现，前端先建立接口契约；后端就绪后此文件无需改动。
 */
export interface SalesTrendItem {
  month: string;
  sales_amount: number;
  order_count: number;
  customer_count: number;
}

export interface RegionSalesItem {
  region: string;
  sales_amount: number;
  percentage: number;
}

export interface CategoryPivotItem {
  category: string;
  [month: string]: string | number;
}

export interface DataAnalysisResult {
  salesTrend: SalesTrendItem[];
  regionSales: RegionSalesItem[];
  categoryPivot: CategoryPivotItem[];
}

export interface DataAnalysisParams {
  time_range?: string;
  region?: string;
  category?: string;
}

export async function fetchSalesTrend(
  params?: DataAnalysisParams
): Promise<ApiResponse<SalesTrendItem[]>> {
  return apiClient.bi.get<SalesTrendItem[]>('/data-analysis/sales-trend', { params });
}

export async function fetchRegionSales(
  params?: DataAnalysisParams
): Promise<ApiResponse<RegionSalesItem[]>> {
  return apiClient.bi.get<RegionSalesItem[]>('/data-analysis/region-sales', { params });
}

export async function fetchCategoryPivot(
  params?: DataAnalysisParams
): Promise<ApiResponse<CategoryPivotItem[]>> {
  return apiClient.bi.get<CategoryPivotItem[]>('/data-analysis/category-pivot', { params });
}

export async function fetchDataAnalysis(
  params?: DataAnalysisParams
): Promise<ApiResponse<DataAnalysisResult>> {
  return apiClient.bi.get<DataAnalysisResult>('/data-analysis', { params });
}
