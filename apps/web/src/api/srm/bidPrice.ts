/**
 * SRM · 报价请求/报价单 API 绑定
 *
 * 后端: svc/srm/src/modules/bid_price.rs
 * 路由:
 *   GET    /bid-requests
 *   POST   /bid-requests
 *   GET    /bid-requests/{id}
 *   PUT    /bid-requests/{id}
 *   DELETE /bid-requests/{id}
 *   GET    /bid-requests/{id}/bids
 *   POST   /bid-requests/{id}/bids
 *   GET    /bids/{id}
 *   PUT    /bids/{id}
 *   DELETE /bids/{id}
 *   GET    /bid-comparisons/{request_id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface BidRequest {
  id: string;
  tenant_id: string;
  request_no: string;
  title: string;
  description?: string;
  deadline?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBidRequest {
  title: string;
  description?: string;
  deadline?: string;
}

export interface UpdateBidRequest {
  title?: string;
  description?: string;
  deadline?: string;
  status?: string;
}

export interface Bid {
  id: string;
  request_id: string;
  supplier_id?: string;
  supplier_name?: string;
  price?: number;
  currency?: string;
  valid_until?: string;
  status: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBidRequestBid {
  supplier_id?: string;
  supplier_name?: string;
  price?: number;
  currency?: string;
  valid_until?: string;
  remarks?: string;
}

export interface UpdateBidRequestBid {
  supplier_id?: string;
  supplier_name?: string;
  price?: number;
  currency?: string;
  valid_until?: string;
  status?: string;
  remarks?: string;
}

export interface BidComparisonItem {
  bid_id: string;
  supplier_id?: string;
  supplier_name?: string;
  price?: number;
  currency?: string;
  unit_price?: number;
  total_amount?: number;
  valid_until?: string;
  status: string;
}

export interface BidComparison {
  request_id: string;
  request_no?: string;
  lowest_price?: number;
  fastest_delivery?: string;
  best_value?: string;
  bids: BidComparisonItem[];
}

export const bidPriceApi = {
  listBidRequests: async (params?: { status?: string }): Promise<ApiResponse<BidRequest[]>> => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.srm.get(`/bid-requests${qs ? `?${qs}` : ''}`);
  },

  getBidRequest: async (id: string): Promise<ApiResponse<BidRequest>> => {
    return apiClient.srm.get(`/bid-requests/${id}`);
  },

  createBidRequest: async (data: CreateBidRequest): Promise<ApiResponse<BidRequest>> => {
    return apiClient.srm.post('/bid-requests', data);
  },

  updateBidRequest: async (
    id: string,
    data: UpdateBidRequest
  ): Promise<ApiResponse<BidRequest>> => {
    return apiClient.srm.put(`/bid-requests/${id}`, data);
  },

  deleteBidRequest: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/bid-requests/${id}`);
  },

  listBidRequestBids: async (requestId: string): Promise<ApiResponse<Bid[]>> => {
    return apiClient.srm.get(`/bid-requests/${requestId}/bids`);
  },

  createBid: async (requestId: string, data: CreateBidRequestBid): Promise<ApiResponse<Bid>> => {
    return apiClient.srm.post(`/bid-requests/${requestId}/bids`, data);
  },

  getBid: async (id: string): Promise<ApiResponse<Bid>> => {
    return apiClient.srm.get(`/bids/${id}`);
  },

  updateBid: async (id: string, data: UpdateBidRequestBid): Promise<ApiResponse<Bid>> => {
    return apiClient.srm.put(`/bids/${id}`, data);
  },

  deleteBid: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/bids/${id}`);
  },

  getBidComparison: async (requestId: string): Promise<ApiResponse<BidComparison>> => {
    return apiClient.srm.get(`/bid-comparisons/${requestId}`);
  },
};

export default bidPriceApi;
