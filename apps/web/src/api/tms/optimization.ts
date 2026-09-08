import apiClient from '../client';
import type { ApiResponse } from '../client';

// ==================== TMS 智能优化 API ====================
// 后端：svc/tms/src/modules/optimization.rs
// /assignments/plan（订单-司机分配）、/routes/optimize（最近邻 TSP 路线）、/freight/quote（运费报价）

// ---- 订单分配 ----
export interface DriverCandidate {
  id: string;
  name: string;
  /** 最大可承载订单数 */
  capacity: number;
  /** 最大载重（kg） */
  max_weight_kg: number;
  available: boolean;
}

export interface OrderCandidate {
  id: string;
  /** 越小越优先 */
  priority: number;
  weight_kg: number;
}

export interface DriverAssignment {
  driver_id: string;
  driver_name: string;
  order_ids: string[];
}

export interface AssignmentResult {
  assignments: DriverAssignment[];
  unassigned: string[];
  assigned_count: number;
}

// ---- 路线优化 ----
export interface RouteOptimizeRequest {
  /** 对称距离矩阵 distances[i][j] = 站点 i → 站点 j 的距离；站点 0 为出发点 */
  distances: number[][];
}

export interface RouteOptimizeResponse {
  /** 访问顺序（站点索引），从 0 出发 */
  visit_order: number[];
  /** 途经站点数 */
  stops: number;
}

// ---- 运费报价 ----
export interface FreightQuoteRequest {
  distance_km: number;
  weight_kg: number;
  rate_per_km: number;
  rate_per_kg: number;
  min_charge: number;
}

export interface FreightQuote {
  distance_charge: number;
  weight_charge: number;
  subtotal: number;
  min_charge_applied: boolean;
  total: number;
}

export const optimizationApi = {
  /** 订单-司机分配：按优先级/重量贪心装入可用司机 */
  planAssignments: async (data: {
    drivers: DriverCandidate[];
    orders: OrderCandidate[];
  }): Promise<ApiResponse<AssignmentResult>> => {
    return apiClient.tms.post('/assignments/plan', data);
  },

  /** 路线优化：最近邻 TSP，返回从站点 0 出发的访问顺序 */
  optimizeRoutes: async (
    data: RouteOptimizeRequest
  ): Promise<ApiResponse<RouteOptimizeResponse>> => {
    return apiClient.tms.post('/routes/optimize', data);
  },

  /** 运费报价：距离费 + 重量费，含最低收费 */
  quoteFreight: async (data: FreightQuoteRequest): Promise<ApiResponse<FreightQuote>> => {
    return apiClient.tms.post('/freight/quote', data);
  },
};

export default optimizationApi;
