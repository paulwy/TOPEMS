import type { PaginationParams } from '../client';

export interface Customer {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  companysize?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  status: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  code?: string;
  industry?: string;
  companysize?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  code?: string;
  industry?: string;
  companysize?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  status?: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  notes?: string;
}

export interface CustomerQueryParams extends PaginationParams {
  status?: string;
  customer_type?: string;
  rating?: string;
  industry?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface Contact {
  id: string;
  customer_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRequest {
  customer_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  customer_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  status?: string;
  notes?: string;
}

export interface ContactQueryParams extends PaginationParams {
  customer_id?: string;
}

export interface Opportunity {
  id: string;
  name: string;
  customer_id?: string;
  value?: number;
  stage: string;
  probability?: number;
  close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOpportunityRequest {
  name: string;
  customer_id?: string;
  value?: number;
  probability?: number;
  close_date?: string;
  notes?: string;
}

export interface UpdateOpportunityRequest {
  name?: string;
  customer_id?: string;
  value?: number;
  stage?: string;
  probability?: number;
  close_date?: string;
  notes?: string;
}

export interface OpportunityQueryParams extends PaginationParams {
  stage?: string;
  customer_id?: string;
}

export interface FunnelStage {
  stage: string;
  stage_label: string;
  count: number;
  total_value?: number;
  avg_probability?: number;
}

export interface OpportunityStats {
  total_count: number;
  total_value?: number;
  weighted_value?: number;
  won_count: number;
  won_value?: number;
  lost_count: number;
  lost_value?: number;
}

export interface OpportunityForecast {
  forecast_month: string;
  forecast_value: number;
  opportunity_count: number;
  avg_probability: number;
}

export interface Interaction {
  id: string;
  customer_id?: string;
  contact_id?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  completed_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateInteractionRequest {
  customer_id?: string;
  contact_id?: string;
  type: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  notes?: string;
}

interface UpdateInteractionRequest {
  customer_id?: string;
  contact_id?: string;
  type?: string;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  completed_at?: string;
  status?: string;
}

export interface InteractionQueryParams extends PaginationParams {
  customer_id?: string;
  contact_id?: string;
}

export interface CustomerScore {
  id: string;
  customer_id: string;
  customer_name: string;
  score: number;
  scorelevel: string;
  scoring_date: string;
  factors: ScoreFactor[];
  trend: 'up' | 'down' | 'stable';
  last_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  max_score: number;
}

export interface CreateCustomerScoreRequest {
  customer_id: string;
  score?: number;
  scorelevel?: string;
}

export interface CustomerScoringQueryParams extends PaginationParams {
  customer_id?: string;
  scorelevel?: string;
}

export interface SalesForecast {
  id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period: string;
  predicted_amount: number;
  actual_amount?: number;
  accuracy?: number;
  trend: 'up' | 'down' | 'stable';
  confidencelevel: number;
  factors: ForecastFactor[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface ForecastFactor {
  name: string;
  impact: number;
  description?: string;
}

export interface CreateSalesForecastRequest {
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period: string;
}

export interface SalesForecastQueryParams extends PaginationParams {
  period_type?: string;
  status?: string;
}

export interface BillingRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_no: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at?: string;
  items: BillingItem[];
  created_at: string;
  updated_at: string;
}

interface BillingItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface CreateBillingRequest {
  customer_id: string;
  invoice_no?: string;
  amount: number;
  currency?: string;
  due_date: string;
  items: BillingItem[];
}

export interface BillingQueryParams extends PaginationParams {
  customer_id?: string;
  status?: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface SegmentCriteria {
  scorelevels?: string[];
  industries?: string[];
  companysizes?: string[];
  statuses?: string[];
  customer_types?: string[];
  revenue_min?: number;
  revenue_max?: number;
  score_min?: number;
  score_max?: number;
  interaction_min?: number;
  opportunity_min?: number;
  tags?: string[];
}

export interface SegmentedCustomer {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  status: string;
  score?: number;
  scorelevel?: string;
  revenue?: number;
  segment_tags: string[];
}

export interface CreateSegmentRequest {
  name: string;
  description?: string;
  criteria: SegmentCriteria;
}

export interface SegmentQueryParams extends PaginationParams {}

export interface RecommendationResult {
  customer_id: string;
  customer_name: string;
  recommendations: RecommendationItem[];
  recommendation_type: string;
  model: string;
  confidence: number;
  created_at: string;
}

export interface RecommendationItem {
  id: string;
  name: string;
  item_type: string;
  confidence: number;
  reason: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RecommendationRequest {
  customer_id: string;
  recommendation_type: string;
  top_k?: number;
  context?: Record<string, unknown>;
}

export interface RecommendationQueryParams extends PaginationParams {
  customer_id?: string;
  recommendation_type?: string;
}

// ---- Returns / Aftersales ----
export type ReturnStatus =
  'pending' | 'approved' | 'rejected' | 'received' | 'completed' | 'cancelled';
export type ReturnType = 'return' | 'exchange';

export interface ReturnRecord {
  id: string;
  return_no: string;
  tenant_id?: string;
  customer_id: string;
  order_id?: string;
  return_type: ReturnType;
  reason: string;
  reason_detail?: string;
  status: ReturnStatus;
  refund_amount?: number;
  exchange_product_id?: string;
  received?: boolean;
  received_at?: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  ticket_id?: string;
  warehouse_id?: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
}

export interface CreateReturnRequest {
  customer_id: string;
  order_id?: string;
  return_type: ReturnType;
  reason: string;
  reason_detail?: string;
  refund_amount?: number;
  exchange_product_id?: string;
  warehouse_id?: string;
}

export interface UpdateReturnRequest {
  reason?: string;
  reason_detail?: string;
  refund_amount?: number;
  warehouse_id?: string;
}

export interface ReturnQueryParams extends PaginationParams {
  search?: string;
  status?: ReturnStatus;
  return_type?: ReturnType;
  customer_id?: string;
  order_id?: string;
}

export interface ReturnFinanceStatus {
  refund_amount: number;
  refund_status: string;
  refunded_at?: string;
}

export interface ReturnInventoryStatus {
  received: boolean;
  received_at?: string;
  warehouse_id?: string;
  items_count: number;
}

// ---- RFM 客户分群 ----

export type RfmSegment =
  'champion' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'cannot_lost' | 'hibernating' | 'lost';

export interface RfmConfig {
  reference_date?: string;
  period_days?: number;
  r_weights?: number[];
  f_weights?: number[];
  m_weights?: number[];
}

export interface RfmRecord {
  customer_id: string;
  customer_name: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_score: number;
  segment: RfmSegment;
}

export interface SegmentStats {
  segment: RfmSegment;
  label: string;
  customer_count: number;
  avg_monetary: number;
  avg_frequency: number;
  avg_recency_days: number;
  avg_rfm_score: number;
}

// ---- 销售预测 ----

export type ForecastMethod =
  'moving_average' | 'weighted_moving_average' | 'exponential_smoothing' | 'linear_regression';

export interface ForecastConfig {
  method: ForecastMethod;
  history_data: number[];
  forecast_periods?: number;
  alpha?: number;
  window_size?: number;
}

export interface ForecastResult {
  method: ForecastMethod;
  forecasts: number[];
  mape: number;
  rmse: number;
  r_squared: number;
}

export interface ForecastMethodInfo {
  method: ForecastMethod;
  label: string;
  description: string;
}

export interface ForecastEvaluation {
  best_method: ForecastMethod;
  results: ForecastResult[];
}
