/**
 * SRM · 招投标 API 绑定
 *
 * 后端: svc/srm/src/modules/tender.rs
 * 路由:
 *   GET    /tenders
 *   POST   /tenders
 *   GET    /tenders/{id}
 *   PUT    /tenders/{id}
 *   DELETE /tenders/{id}
 *   GET    /tenders/{id}/bids
 *   POST   /tenders/{id}/bids
 *   POST   /tenders/{id}/award
 *   GET    /tender-awards
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface Tender {
  id: string;
  tenant_id: string;
  tender_no: string;
  title: string;
  description?: string;
  type: string;
  budget?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenderRequest {
  title: string;
  description?: string;
  type?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateTenderRequest {
  title?: string;
  description?: string;
  type?: string;
  budget?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface TenderBid {
  id: string;
  tender_id: string;
  supplier_id?: string;
  supplier_name?: string;
  bid_price?: number;
  currency?: string;
  technical_score?: number;
  commercial_score?: number;
  total_score?: number;
  status: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenderBidRequest {
  supplier_id?: string;
  supplier_name?: string;
  bid_price?: number;
  currency?: string;
  remarks?: string;
}

export interface TenderAward {
  id: string;
  award_no: string;
  tender_id: string;
  tender_no?: string;
  bid_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  award_price?: number;
  currency?: string;
  status: string;
  remarks?: string;
  awarded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AwardTenderRequest {
  bid_id?: string;
  supplier_id?: string;
  award_price?: number;
  currency?: string;
  remarks?: string;
}

export const tenderApi = {
  listTenders: async (params?: {
    status?: string;
    type?: string;
  }): Promise<ApiResponse<Tender[]>> => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.srm.get(`/tenders${qs ? `?${qs}` : ''}`);
  },

  getTender: async (id: string): Promise<ApiResponse<Tender>> => {
    return apiClient.srm.get(`/tenders/${id}`);
  },

  createTender: async (data: CreateTenderRequest): Promise<ApiResponse<Tender>> => {
    return apiClient.srm.post('/tenders', data);
  },

  updateTender: async (id: string, data: UpdateTenderRequest): Promise<ApiResponse<Tender>> => {
    return apiClient.srm.put(`/tenders/${id}`, data);
  },

  deleteTender: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/tenders/${id}`);
  },

  listTenderBids: async (tenderId: string): Promise<ApiResponse<TenderBid[]>> => {
    return apiClient.srm.get(`/tenders/${tenderId}/bids`);
  },

  createTenderBid: async (
    tenderId: string,
    data: CreateTenderBidRequest
  ): Promise<ApiResponse<TenderBid>> => {
    return apiClient.srm.post(`/tenders/${tenderId}/bids`, data);
  },

  awardTender: async (
    tenderId: string,
    data: AwardTenderRequest
  ): Promise<ApiResponse<TenderAward>> => {
    return apiClient.srm.post(`/tenders/${tenderId}/award`, data);
  },

  listTenderAwards: async (params?: { status?: string }): Promise<ApiResponse<TenderAward[]>> => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.srm.get(`/tender-awards${qs ? `?${qs}` : ''}`);
  },
};

export default tenderApi;
