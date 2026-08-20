import apiClient from '../client';
import type { ApiResponse } from '../client';

import {
  supplierCategoryApi,
  type SupplierCategory,
  type CreateSupplierCategoryRequest,
  type UpdateSupplierCategoryRequest,
  type SupplierCategoryQuery,
  type SupplierCategoryNode,
} from './supplierCategory';

import {
  supplierProductApi,
  type SupplierProduct,
  type CreateSupplierProductRequest,
  type UpdateSupplierProductRequest,
  type SupplierProductQuery,
} from './supplierProduct';

import {
  tenderApi,
  type Tender,
  type CreateTenderRequest,
  type UpdateTenderRequest,
  type TenderBid,
  type CreateTenderBidRequest,
  type TenderAward,
  type AwardTenderRequest,
} from './tender';

import {
  bidPriceApi,
  type BidRequest,
  type CreateBidRequest,
  type UpdateBidRequest,
  type Bid,
  type CreateBidRequestBid,
  type UpdateBidRequestBid,
  type BidComparison,
} from './bidPrice';

export interface Supplier {
  id: string;
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risklevel: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risklevel: string;
}

export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  evaluation_no: string;
  evaluation_date: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierEvaluationRequest {
  supplier_id: string;
  evaluation_no: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  po_no: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  actual_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  po_no: string;
  supplier_id: string;
  expected_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
}

// Supplier Contract types
export interface SupplierContract {
  id: string;
  contractNo: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface CreateSupplierContractRequest {
  contractNo: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
}

// Statistics types
interface SrmStatistics {
  total_suppliers: number;
  active_suppliers: number;
  total_evaluations: number;
  avg_score: number;
  total_orders: number;
  total_order_amount: number;
  pending_orders: number;
  completed_orders: number;
  total_contracts: number;
  active_contracts: number;
}

interface SupplierWithStats {
  supplier: Supplier;
  total_orders: number;
  total_amount: number;
  avg_evaluation_score?: number;
  last_order_date?: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

interface MonthlyOrderTrend {
  month: string;
  order_count: number;
  total_amount: number;
}

export interface SrmDetailedStatistics {
  basic: SrmStatistics;
  supplier_by_category: CategoryCount[];
  supplier_by_status: StatusCount[];
  order_by_status: StatusCount[];
  evaluation_score_distribution: ScoreDistribution[];
  monthly_order_trend: MonthlyOrderTrend[];
  contract_by_status: StatusCount[];
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  total_amount: number;
  avg_quality_score?: number;
  avg_delivery_score?: number;
  avg_service_score?: number;
  avg_price_score?: number;
  avg_overall_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  last_evaluation_date?: string;
  evaluation_count: number;
}

export interface ScoringDimension {
  id: string;
  name: string;
  code: string;
  weight: number;
  min_score: number;
  max_score: number;
  description?: string;
  isactive: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateScoringDimensionRequest {
  name: string;
  code: string;
  weight: number;
  min_score: number;
  max_score: number;
  description?: string;
  isactive: boolean;
  sort_order: number;
}

export interface PerformanceSummary {
  total_suppliers: number;
  evaluated_suppliers: number;
  evaluation_rate: number;
  avg_overall_score: number;
  top_supplier?: { name: string; avg_score: number };
  bottom_supplier?: { name: string; avg_score: number };
  category_scores: {
    category: string;
    avg_score: number;
    supplier_count: number;
  }[];
}

interface ScoreLevelDistribution {
  level: string;
  label: string;
  count: number;
}

interface ScoreLevelDefinitions {
  level: string;
  range: string;
  description: string;
}

interface PerformanceReportParams {
  page?: number;
  pagesize?: number;
  search?: string;
  category?: string;
  status?: string;
  supplier_id?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: string | number | boolean | undefined;
}

interface PerformanceReportDetail {
  id: string;
  supplier_id: string;
  supplier_name: string;
  report_period: string;
  overall_score: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  total_orders: number;
  total_amount: number;
  evaluation_count: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  generated_at: string;
}

interface PerformanceTrendItem {
  period: string;
  avg_overall_score: number;
  avg_quality_score?: number;
  avg_delivery_score?: number;
  avg_service_score?: number;
  avg_price_score?: number;
  order_count: number;
  total_amount: number;
}

interface PerformanceTrendResponse {
  supplier_id?: string;
  supplier_name?: string;
  period: string;
  trends: PerformanceTrendItem[];
}

interface SupplierComparison {
  supplier_id: string;
  supplier_name: string;
  overall_score: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  on_time_delivery_rate?: number;
  defect_rate?: number;
  total_orders: number;
  total_amount: number;
  evaluation_count: number;
  rank: number;
}

interface SupplierComparisonResponse {
  suppliers: SupplierComparison[];
  comparison_date: string;
  best_supplier?: string;
  worst_supplier?: string;
}

// Supplier Portal types
export interface SupplierPortalStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_amount: number;
  pending_invoices: number;
  paid_invoices: number;
  pending_deliveries: number;
  on_time_delivery_rate: number;
  quality_score: number;
}

// Inquiry & Quotation types
export interface Inquiry {
  id: string;
  inquiry_no: string;
  title: string;
  description?: string;
  category?: string;
  urgency?: string;
  status: string;
  published_at?: string;
  deadline?: string;
  creator?: string;
  department?: string;
  quotation_count?: number;
  items?: InquiryItem[];
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface InquiryItem {
  id: string;
  sku: string;
  material_name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  expected_price?: number;
  remark?: string;
}

interface CreateInquiryRequest {
  inquiry_no: string;
  title: string;
  description?: string;
  category?: string;
  urgency?: string;
  deadline?: string;
  items?: InquiryItem[];
  remarks?: string;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  inquiry_id: string;
  inquiry_no?: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  total_amount: number;
  currency: string;
  valid_until?: string;
  delivery_time?: string;
  payment_terms?: string;
  status: string;
  items?: QuotationItem[];
  remarks?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

interface QuotationItem {
  id: string;
  sku: string;
  material_name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  subtotal: number;
  delivery_time?: string;
  remark?: string;
}

interface CreateQuotationRequest {
  inquiry_id: string;
  supplier_id: string;
  title: string;
  total_amount: number;
  currency: string;
  valid_until?: string;
  delivery_time?: string;
  payment_terms?: string;
  items?: QuotationItem[];
  remarks?: string;
}

// Bidding types
export interface Bidding {
  id: string;
  bidding_no: string;
  title: string;
  description?: string;
  category?: string;
  bidding_type?: string;
  status: string;
  budget_amount?: number;
  currency: string;
  publish_date?: string;
  bid_deadline?: string;
  open_date?: string;
  winner_supplier_id?: string;
  winner_supplier_name?: string;
  winner_amount?: number;
  supplier_count?: number;
  creator?: string;
  department?: string;
  items?: BiddingItem[];
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface BiddingItem {
  id: string;
  sku: string;
  material_name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  estimated_price?: number;
  remark?: string;
}

interface CreateBiddingRequest {
  bidding_no: string;
  title: string;
  description?: string;
  category?: string;
  bidding_type?: string;
  budget_amount?: number;
  currency: string;
  bid_deadline?: string;
  open_date?: string;
  items?: BiddingItem[];
  remarks?: string;
}

export const srmApi = {
  // Suppliers
  listSuppliers: async (): Promise<ApiResponse<Supplier[]>> => {
    return apiClient.srm.get<Supplier[]>('/suppliers');
  },
  getSupplier: async (id: string): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.get<Supplier>(`/suppliers/${id}`);
  },
  createSupplier: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.post<Supplier>('/suppliers', data);
  },
  updateSupplier: async (
    id: string,
    data: CreateSupplierRequest
  ): Promise<ApiResponse<Supplier>> => {
    return apiClient.srm.put<Supplier>(`/suppliers/${id}`, data);
  },
  deleteSupplier: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/suppliers/${id}`);
  },

  // Supplier Evaluations
  listEvaluations: async (): Promise<ApiResponse<SupplierEvaluation[]>> => {
    return apiClient.srm.get<SupplierEvaluation[]>('/supplier-evaluations');
  },
  getEvaluation: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.get<SupplierEvaluation>(`/supplier-evaluations/${id}`);
  },
  createEvaluation: async (
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.post<SupplierEvaluation>('/supplier-evaluations', data);
  },
  updateEvaluation: async (
    id: string,
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.srm.put<SupplierEvaluation>(`/supplier-evaluations/${id}`, data);
  },
  deleteEvaluation: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/supplier-evaluations/${id}`);
  },

  // Purchase Orders
  listPurchaseOrders: async (): Promise<ApiResponse<PurchaseOrder[]>> => {
    return apiClient.srm.get<PurchaseOrder[]>('/purchase-orders');
  },
  getPurchaseOrder: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },
  createPurchaseOrder: async (
    data: CreatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.post<PurchaseOrder>('/purchase-orders', data);
  },
  updatePurchaseOrder: async (
    id: string,
    data: CreatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> => {
    return apiClient.srm.put<PurchaseOrder>(`/purchase-orders/${id}`, data);
  },
  deletePurchaseOrder: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/purchase-orders/${id}`);
  },

  // Supplier Contracts
  listContracts: async (): Promise<ApiResponse<SupplierContract[]>> => {
    return apiClient.srm.get<SupplierContract[]>('/supplier-contracts');
  },
  getContract: async (id: string): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.get<SupplierContract>(`/supplier-contracts/${id}`);
  },
  createContract: async (
    data: CreateSupplierContractRequest
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.post<SupplierContract>('/supplier-contracts', data);
  },
  updateContract: async (
    id: string,
    data: CreateSupplierContractRequest
  ): Promise<ApiResponse<SupplierContract>> => {
    return apiClient.srm.put<SupplierContract>(`/supplier-contracts/${id}`, data);
  },
  deleteContract: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/supplier-contracts/${id}`);
  },

  // Statistics
  getStatistics: async (): Promise<ApiResponse<SrmStatistics>> => {
    return apiClient.srm.get<SrmStatistics>('/statistics');
  },
  getDetailedStatistics: async (): Promise<ApiResponse<SrmDetailedStatistics>> => {
    return apiClient.srm.get<SrmDetailedStatistics>('/statistics/detailed');
  },
  getSuppliersWithStats: async (): Promise<ApiResponse<SupplierWithStats[]>> => {
    return apiClient.srm.get<SupplierWithStats[]>('/suppliers-with-stats');
  },

  // Scoring Dimensions
  listScoringDimensions: async (): Promise<ApiResponse<ScoringDimension[]>> => {
    return apiClient.srm.get<ScoringDimension[]>('/scoring-dimensions');
  },
  listActiveScoringDimensions: async (): Promise<ApiResponse<ScoringDimension[]>> => {
    return apiClient.srm.get<ScoringDimension[]>('/scoring-dimensions/active');
  },
  getScoringDimension: async (id: string): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.get<ScoringDimension>(`/scoring-dimensions/${id}`);
  },
  createScoringDimension: async (
    data: CreateScoringDimensionRequest
  ): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.post<ScoringDimension>('/scoring-dimensions', data);
  },
  updateScoringDimension: async (
    id: string,
    data: CreateScoringDimensionRequest
  ): Promise<ApiResponse<ScoringDimension>> => {
    return apiClient.srm.put<ScoringDimension>(`/scoring-dimensions/${id}`, data);
  },
  deleteScoringDimension: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete<boolean>(`/scoring-dimensions/${id}`);
  },

  // Performance Reports
  getPerformanceReports: async (
    params?: PerformanceReportParams
  ): Promise<
    ApiResponse<{
      performances: SupplierPerformance[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.srm.get(`/performance/reports${query ? `?${query}` : ''}`);
  },
  getPerformanceReport: async (id: string): Promise<ApiResponse<PerformanceReportDetail>> => {
    return apiClient.srm.get(`/performance/reports/${id}`);
  },
  getPerformanceSummary: async (): Promise<ApiResponse<PerformanceSummary>> => {
    return apiClient.srm.get<PerformanceSummary>('/performance/summary');
  },
  getScoreLevelDistribution: async (): Promise<
    ApiResponse<{
      distribution: ScoreLevelDistribution[];
      level_definitions: ScoreLevelDefinitions[];
    }>
  > => {
    return apiClient.srm.get('/performance/score-level-distribution');
  },
  getTopSuppliers: async (): Promise<
    ApiResponse<{
      top_by_score: SupplierPerformance[];
      top_by_orders: SupplierPerformance[];
    }>
  > => {
    return apiClient.srm.get('/performance/top-suppliers');
  },
  getPerformanceTrend: async (params?: {
    supplier_id?: string;
    period?: string;
  }): Promise<ApiResponse<PerformanceTrendResponse>> => {
    const query = new URLSearchParams(params).toString();
    return apiClient.srm.get(`/performance/trend${query ? `?${query}` : ''}`);
  },
  compareSupplierPerformance: async (
    supplier_ids: string[]
  ): Promise<ApiResponse<SupplierComparisonResponse>> => {
    return apiClient.srm.get(`/performance/compare?supplier_ids=${supplier_ids.join(',')}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.srm.get<string>('/health');
  },

  // Supplier Portal
  getSupplierPortalStats: async (supplierId: string): Promise<ApiResponse<SupplierPortalStats>> => {
    return apiClient.srm.get(`/supplier-portal/${supplierId}/stats`);
  },
  getSupplierPortalOrders: async (supplierId: string): Promise<ApiResponse<PurchaseOrder[]>> => {
    return apiClient.srm.get(`/supplier-portal/${supplierId}/orders`);
  },
  getSupplierPortalInvoices: async (supplierId: string): Promise<ApiResponse<unknown[]>> => {
    return apiClient.srm.get(`/supplier-portal/${supplierId}/invoices`);
  },
  getSupplierPortalDeliveries: async (supplierId: string): Promise<ApiResponse<unknown[]>> => {
    return apiClient.srm.get(`/supplier-portal/${supplierId}/deliveries`);
  },
  getSupplierPortalAnnouncements: async (): Promise<ApiResponse<unknown[]>> => {
    return apiClient.srm.get('/supplier-portal/announcements');
  },

  // Inquiry & Quotation
  listInquiries: async (
    params?: Record<string, unknown>
  ): Promise<ApiResponse<{ items: Inquiry[]; total: number }>> => {
    return apiClient.srm.get('/inquiries', { params });
  },
  getInquiry: async (id: string): Promise<ApiResponse<Inquiry>> => {
    return apiClient.srm.get(`/inquiries/${id}`);
  },
  createInquiry: async (data: CreateInquiryRequest): Promise<ApiResponse<Inquiry>> => {
    return apiClient.srm.post('/inquiries', data);
  },
  updateInquiry: async (
    id: string,
    data: Partial<CreateInquiryRequest>
  ): Promise<ApiResponse<Inquiry>> => {
    return apiClient.srm.put(`/inquiries/${id}`, data);
  },
  deleteInquiry: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/inquiries/${id}`);
  },
  publishInquiry: async (id: string): Promise<ApiResponse<Inquiry>> => {
    return apiClient.srm.post(`/inquiries/${id}/publish`);
  },
  closeInquiry: async (id: string): Promise<ApiResponse<Inquiry>> => {
    return apiClient.srm.post(`/inquiries/${id}/close`);
  },

  listQuotations: async (inquiryId?: string): Promise<ApiResponse<Quotation[]>> => {
    const url = inquiryId ? `/quotations?inquiry_id=${inquiryId}` : '/quotations';
    return apiClient.srm.get(url);
  },
  getQuotation: async (id: string): Promise<ApiResponse<Quotation>> => {
    return apiClient.srm.get(`/quotations/${id}`);
  },
  createQuotation: async (data: CreateQuotationRequest): Promise<ApiResponse<Quotation>> => {
    return apiClient.srm.post('/quotations', data);
  },
  updateQuotation: async (
    id: string,
    data: Partial<CreateQuotationRequest>
  ): Promise<ApiResponse<Quotation>> => {
    return apiClient.srm.put(`/quotations/${id}`, data);
  },
  awardQuotation: async (id: string): Promise<ApiResponse<Quotation>> => {
    return apiClient.srm.post(`/quotations/${id}/award`);
  },
  rejectQuotation: async (id: string): Promise<ApiResponse<Quotation>> => {
    return apiClient.srm.post(`/quotations/${id}/reject`);
  },

  // Bidding
  listBiddings: async (
    params?: Record<string, unknown>
  ): Promise<ApiResponse<{ items: Bidding[]; total: number }>> => {
    return apiClient.srm.get('/biddings', { params });
  },
  getBidding: async (id: string): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.get(`/biddings/${id}`);
  },
  createBidding: async (data: CreateBiddingRequest): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.post('/biddings', data);
  },
  updateBidding: async (
    id: string,
    data: Partial<CreateBiddingRequest>
  ): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.put(`/biddings/${id}`, data);
  },
  deleteBidding: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.srm.delete(`/biddings/${id}`);
  },
  publishBidding: async (id: string): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.post(`/biddings/${id}/publish`);
  },
  openBidding: async (id: string): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.post(`/biddings/${id}/open`);
  },
  evaluateBidding: async (id: string): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.post(`/biddings/${id}/evaluate`);
  },
  awardBidding: async (id: string, supplierId: string): Promise<ApiResponse<Bidding>> => {
    return apiClient.srm.post(`/biddings/${id}/award`, { supplier_id: supplierId });
  },
  listBiddingSuppliers: async (biddingId: string): Promise<ApiResponse<unknown[]>> => {
    return apiClient.srm.get(`/biddings/${biddingId}/suppliers`);
  },

  // Supplier Categories
  listCategories: supplierCategoryApi.listCategories,
  listAllCategories: supplierCategoryApi.listAllCategories,
  getCategory: supplierCategoryApi.getCategory,
  createCategory: supplierCategoryApi.createCategory,
  updateCategory: supplierCategoryApi.updateCategory,
  deleteCategory: supplierCategoryApi.deleteCategory,
  buildCategoryTree: supplierCategoryApi.buildTree,

  // Supplier Products
  listProducts: supplierProductApi.listProducts,
  listSupplierProducts: supplierProductApi.listSupplierProducts,
  getProduct: supplierProductApi.getProduct,
  createProduct: supplierProductApi.createProduct,
  updateProduct: supplierProductApi.updateProduct,
  deleteProduct: supplierProductApi.deleteProduct,

  // Tenders
  listTenders: tenderApi.listTenders,
  getTender: tenderApi.getTender,
  createTender: tenderApi.createTender,
  updateTender: tenderApi.updateTender,
  deleteTender: tenderApi.deleteTender,
  listTenderBids: tenderApi.listTenderBids,
  createTenderBid: tenderApi.createTenderBid,
  awardTender: tenderApi.awardTender,
  listTenderAwards: tenderApi.listTenderAwards,

  // Bid Requests & Bids
  listBidRequests: bidPriceApi.listBidRequests,
  getBidRequest: bidPriceApi.getBidRequest,
  createBidRequest: bidPriceApi.createBidRequest,
  updateBidRequest: bidPriceApi.updateBidRequest,
  deleteBidRequest: bidPriceApi.deleteBidRequest,
  listBidRequestBids: bidPriceApi.listBidRequestBids,
  createBid: bidPriceApi.createBid,
  getBid: bidPriceApi.getBid,
  updateBid: bidPriceApi.updateBid,
  deleteBid: bidPriceApi.deleteBid,
  getBidComparison: bidPriceApi.getBidComparison,
};

export { bidPriceApi };

export type {
  SupplierCategory,
  CreateSupplierCategoryRequest,
  UpdateSupplierCategoryRequest,
  SupplierCategoryQuery,
  SupplierCategoryNode,
  SupplierProduct,
  CreateSupplierProductRequest,
  UpdateSupplierProductRequest,
  SupplierProductQuery,
  Tender,
  CreateTenderRequest,
  UpdateTenderRequest,
  TenderBid,
  CreateTenderBidRequest,
  TenderAward,
  AwardTenderRequest,
  BidRequest,
  CreateBidRequest,
  UpdateBidRequest,
  Bid,
  CreateBidRequestBid,
  UpdateBidRequestBid,
  BidComparison,
};

export default srmApi;
