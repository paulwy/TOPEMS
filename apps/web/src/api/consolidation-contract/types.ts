import type { ApiResponse, PaginatedResponse } from '../client';

export type ConsolidationMethod = 'full' | 'equity' | 'proportional';
export type ScopeStatus = 'active' | 'inactive' | 'draft';
export type ControlType = 'full_control' | 'joint_venture' | 'associate';
export type EliminationDirection = 'debit' | 'credit' | 'both';
export type EliminationStatus = 'pending' | 'eliminated' | 'partial' | 'not_applicable';
export type ReportStatus = 'draft' | 'calculating' | 'completed' | 'published';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CompanyRelationType =
  'parent' | 'subsidiary' | 'associate' | 'joint_venture' | 'branch';
export type CompanyRelationStatus = 'active' | 'inactive';

export interface ConsolidationScope {
  id: string;
  code: string;
  name: string;
  description?: string;
  consolidation_method: ConsolidationMethod;
  status: ScopeStatus;
  company_count?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface CreateScopeRequest {
  code: string;
  name: string;
  description?: string;
  consolidation_method?: ConsolidationMethod;
  status?: ScopeStatus;
}

export interface UpdateScopeRequest {
  name?: string;
  description?: string;
  consolidation_method?: ConsolidationMethod;
  status?: ScopeStatus;
}

export interface ScopeQuery {
  keyword?: string;
  status?: ScopeStatus;
  consolidation_method?: ConsolidationMethod;
  page?: number;
  page_size?: number;
}

export interface ScopeCompany {
  id: string;
  scope_id: string;
  company_id: string;
  company_code: string;
  company_name: string;
  is_parent: boolean;
  control_type: ControlType;
  ownership_percentage: number;
  consolidation_percentage: number;
  minority_interest?: number;
  effective_date?: string;
  created_at?: string;
}

export interface AddScopeCompanyRequest {
  scope_id: string;
  company_id: string;
  is_parent?: boolean;
  control_type: ControlType;
  ownership_percentage: number;
  consolidation_percentage: number;
  minority_interest?: number;
  effective_date?: string;
}

export interface UpdateScopeCompanyRequest {
  control_type?: ControlType;
  ownership_percentage?: number;
  consolidation_percentage?: number;
  minority_interest?: number;
  expiry_date?: string;
}

export interface EliminationRule {
  id: string;
  scope_id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  direction: EliminationDirection;
  debit_account_codes?: string[];
  credit_account_codes?: string[];
  company_pairs?: Array<{ [key: string]: unknown }>;
  auto_elimination: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEliminationRuleRequest {
  scope_id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  direction?: EliminationDirection;
  debit_account_codes?: string[];
  credit_account_codes?: string[];
  company_pairs?: Array<{ [key: string]: unknown }>;
  auto_elimination?: boolean;
  priority?: number;
}

export interface UpdateEliminationRuleRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  direction?: EliminationDirection;
  debit_account_codes?: string[];
  credit_account_codes?: string[];
  company_pairs?: Array<{ [key: string]: unknown }>;
  auto_elimination?: boolean;
  priority?: number;
}

export interface EliminationRuleQuery {
  scope_id: string;
  type?: string;
  status?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface InternalTransaction {
  id: string;
  transaction_no: string;
  transaction_date: string;
  period: string;
  from_company_id: string;
  from_company_name: string;
  to_company_id: string;
  to_company_name: string;
  transaction_type: string;
  description?: string;
  amount: number;
  currency: string;
  elimination_status: EliminationStatus;
  eliminated_amount?: number;
  remaining_amount?: number;
  voucher_id?: string;
  elimination_voucher_id?: string;
  created_at?: string;
}

export interface InternalTransactionQuery {
  scope_id?: string;
  from_company_id?: string;
  to_company_id?: string;
  transaction_type?: string;
  elimination_status?: EliminationStatus;
  period_from?: string;
  period_to?: string;
  page?: number;
  page_size?: number;
}

export interface ExecuteEliminationRequest {
  scope_id: string;
  period: string;
  rule_ids?: string[];
}

export interface ExecuteEliminationResult {
  eliminated_count: number;
  total_eliminated: number;
  results: Array<{
    rule_id: string;
    rule_name: string;
    rule_type: string;
    transaction_count: number;
    total_eliminated: number;
    success: boolean;
    error_message?: string;
  }>;
}

export interface ConsolidationReport {
  id: string;
  report_no: string;
  report_type: string;
  scope_id: string;
  scope_name: string;
  period: string;
  status: ReportStatus;
  company_count: number;
  eliminated_company_count: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  net_profit?: number;
  approval_status: ApprovalStatus;
  generated_at?: string;
  created_at?: string;
}

export interface ConsolidationReportDetail extends ConsolidationReport {
  year: number;
  quarter?: number;
  month?: number;
  total_revenue?: number;
  total_profit?: number;
  minority_interest?: number;
  parent_net_profit?: number;
  approved_by?: string;
  approved_at?: string;
  published_by?: string;
  published_at?: string;
  generated_by?: string;
  updated_at?: string;
}

export interface GenerateReportRequest {
  scope_id: string;
  report_type: string;
  period: string;
  include_prior_period?: boolean;
  auto_eliminate?: boolean;
}

export interface GenerateReportResult {
  report_id: string;
  report_no: string;
  status: 'calculating' | 'completed';
  elimination_results: Array<{
    rule_id: string;
    rule_name: string;
    rule_type: string;
    transaction_count: number;
    total_eliminated: number;
    success: boolean;
    error_message?: string;
  }>;
  generated_at: string;
  warnings?: string[];
}

export interface ReportLine {
  id: string;
  report_id: string;
  line_no: number;
  item_code?: string;
  item_name: string;
  itemlevel: number;
  current_period: number;
  prior_period?: number;
  company_breakdown?: Array<{ [key: string]: unknown }>;
  elimination_breakdown?: Array<{ [key: string]: unknown }>;
  formula?: string;
  notes?: string;
}

export interface ReportQuery {
  scope_id?: string;
  report_type?: string;
  period_from?: string;
  period_to?: string;
  status?: ReportStatus;
  approval_status?: ApprovalStatus;
  page?: number;
  page_size?: number;
}

export interface CompanyRelation {
  id: string;
  parent_company_id: string;
  parent_company_name: string;
  child_company_id: string;
  child_company_name: string;
  relation_type: CompanyRelationType;
  ownership_percentage: number;
  control_percentage?: number;
  effective_date: string;
  expiry_date?: string;
  status: CompanyRelationStatus;
}

export interface CreateCompanyRelationRequest {
  parent_company_id: string;
  child_company_id: string;
  relation_type: CompanyRelationType;
  ownership_percentage: number;
  control_percentage?: number;
  effective_date: string;
  expiry_date?: string;
}

export interface UpdateCompanyRelationRequest {
  ownership_percentage?: number;
  control_percentage?: number;
  expiry_date?: string;
  status?: CompanyRelationStatus;
}

export interface CompanyRelationQuery {
  company_id?: string;
  relation_type?: CompanyRelationType;
}

export interface CompanyTreeNode {
  id: string;
  name: string;
  code: string;
  level: number;
  is_parent: boolean;
  children?: CompanyTreeNode[];
}

export interface CompanyFinancialData {
  company_id: string;
  company_name: string;
  period: string;
  current_assets: number;
  non_current_assets: number;
  total_assets: number;
  current_liabilities: number;
  non_current_liabilities: number;
  total_liabilities: number;
  paid_in_capital: number;
  capital_reserve: number;
  surplus_reserve: number;
  undistributed_profit: number;
  total_equity: number;
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_profit: number;
  profit_before_tax: number;
  net_profit: number;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_flow: number;
}

export type ConsolidationApiResponse<T> = ApiResponse<T>;
export type ConsolidationPaginatedResponse<T> = PaginatedResponse<T>;
