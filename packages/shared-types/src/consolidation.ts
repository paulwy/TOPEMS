export type ConsolidationScopeStatus = 'active' | 'inactive' | 'draft';

export interface ConsolidationScope {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: ConsolidationScopeStatus;
  consolidation_method: 'full' | 'equity' | 'proportional';
  created_at: string;
  updated_at: string;
}

export interface ConsolidationCompany {
  id: string;
  scope_id: string;
  company_id: string;
  company_name: string;
  company_code: string;
  ownership_percentage: number;
  consolidation_percentage: number;
  is_parent: boolean;
  control_type: 'full_control' | 'joint_venture' | 'associate';
  minority_interest: number;
  created_at: string;
}

export interface AddCompanyToScopeRequest {
  scope_id: string;
  company_id: string;
  ownership_percentage: number;
  consolidation_percentage: number;
  control_type: 'full_control' | 'joint_venture' | 'associate';
}

export type EliminationRuleType =
  | 'investment_in_subsidiary'
  | 'intra_receivable_payable'
  | 'intra_sales_purchase'
  | 'intra_profit_loss'
  | 'intra_dividend'
  | 'intra_loan'
  | 'other';

export type EliminationRuleStatus = 'active' | 'inactive' | 'draft';

export interface EliminationRule {
  id: string;
  scope_id: string;
  name: string;
  code: string;
  type: EliminationRuleType;
  description?: string;
  status: EliminationRuleStatus;
  direction: 'debit' | 'credit' | 'both';
  debit_account_codes?: string[];
  credit_account_codes?: string[];
  company_pairs?: {
    from_company_id: string;
    to_company_id: string;
  }[];
  auto_elimination: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
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
  transaction_type: EliminationRuleType;
  description?: string;
  amount: number;
  currency: string;
  elimination_status: 'pending' | 'eliminated' | 'partial' | 'not_applicable';
  eliminated_amount: number;
  remaining_amount: number;
  voucher_id?: string;
  elimination_voucher_id?: string;
  created_at: string;
}

export type ConsolidationReportType =
  | 'consolidated_balance_sheet'
  | 'consolidated_income_statement'
  | 'consolidated_cash_flow'
  | 'consolidated_statement_changes'
  | 'elimination_work_sheet';

export type ConsolidationReportStatus = 'draft' | 'calculating' | 'completed' | 'published';

export interface ConsolidationReport {
  id: string;
  report_no: string;
  report_type: ConsolidationReportType;
  scope_id: string;
  scope_name: string;
  period: string;
  year: number;
  quarter?: number;
  month?: number;
  status: ConsolidationReportStatus;
  company_count: number;
  eliminated_company_count: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  total_revenue?: number;
  total_profit?: number;
  net_profit?: number;
  minority_interest?: number;
  归属于母公司净利润?: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  published_by?: string;
  published_at?: string;
  generated_by?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationReportLine {
  id: string;
  report_id: string;
  line_no: number;
  item_code?: string;
  item_name: string;
  itemlevel: number;
  current_period: number;
  prior_period?: number;
  company_breakdown?: {
    company_id: string;
    company_name: string;
    amount: number;
  }[];
  elimination_breakdown?: {
    elimination_type: EliminationRuleType;
    amount: number;
  }[];
  formula?: string;
  notes?: string;
}

export interface GenerateConsolidationReportRequest {
  scope_id: string;
  report_type: ConsolidationReportType;
  period: string;
  include_prior_period: boolean;
  auto_eliminate: boolean;
}

export interface EliminationResult {
  rule_id: string;
  rule_name: string;
  rule_type: EliminationRuleType;
  transaction_count: number;
  total_eliminated: number;
  success: boolean;
  error_message?: string;
}

export interface ConsolidationReportGenerateResult {
  report_id: string;
  report_no: string;
  status: ConsolidationReportStatus;
  elimination_results: EliminationResult[];
  generated_at: string;
  warnings?: string[];
}

export interface ConsolidationScopeQueryParams {
  keyword?: string;
  status?: ConsolidationScopeStatus;
  consolidation_method?: string;
  page?: number;
  pagesize?: number;
}

export interface EliminationRuleQueryParams {
  scope_id: string;
  type?: EliminationRuleType;
  status?: EliminationRuleStatus;
  keyword?: string;
  page?: number;
  pagesize?: number;
}

export interface InternalTransactionQueryParams {
  scope_id?: string;
  from_company_id?: string;
  to_company_id?: string;
  transaction_type?: EliminationRuleType;
  elimination_status?: string;
  period_from?: string;
  period_to?: string;
  page?: number;
  pagesize?: number;
}

export interface ConsolidationReportQueryParams {
  scope_id?: string;
  report_type?: ConsolidationReportType;
  period_from?: string;
  period_to?: string;
  status?: ConsolidationReportStatus;
  approval_status?: string;
  page?: number;
  pagesize?: number;
}

export type CompanyRelationType =
  | 'parent'
  | 'subsidiary'
  | 'associate'
  | 'joint_venture'
  | 'branch';

export interface CompanyRelation {
  id: string;
  parent_company_id: string;
  parent_company_name: string;
  parent_company_code?: string;
  child_company_id: string;
  child_company_name: string;
  child_company_code?: string;
  relation_type: CompanyRelationType;
  ownership_percentage: number;
  control_percentage: number;
  effective_date: string;
  expiry_date?: string;
  status: 'active' | 'inactive';
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

export interface CompanyTreeNode {
  id: string;
  name: string;
  code: string;
  level: number;
  is_parent?: boolean;
  relation_type?: CompanyRelationType;
  ownership_percentage?: number;
  children: CompanyTreeNode[];
}

export interface CompanyStructureItem {
  id: string;
  parent_company_id: string;
  parent_company_name: string;
  parent_company_code: string;
  child_company_id: string;
  child_company_name: string;
  child_company_code: string;
  relation_type: CompanyRelationType;
  ownership_percentage: number;
  control_percentage: number;
  effective_date: string;
  expiry_date?: string;
  status: 'active' | 'inactive';
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
  status?: 'active' | 'inactive';
}

export interface CompanyRelationQueryParams {
  company_id?: string;
  relation_type?: CompanyRelationType;
  status?: 'active' | 'inactive';
  keyword?: string;
  page?: number;
  pagesize?: number;
}