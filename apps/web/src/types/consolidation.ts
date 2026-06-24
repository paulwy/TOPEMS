/**
 * 合并报表类型定义
 * 支持多公司财务报表合并、内部交易抵消
 */

// ============================================
// 一、合并范围管理
// ============================================

/**
 * 合并范围状态
 */
export type ConsolidationScopeStatus = 'active' | 'inactive' | 'draft';

/**
 * 合并范围
 */
export interface ConsolidationScope {
  id: string;
  name: string; // 合并范围名称
  code: string; // 合并范围编码
  description?: string; // 说明
  status: ConsolidationScopeStatus; // 状态
  consolidation_method: 'full' | 'equity' | 'proportional'; // 合并方法
  created_at: string;
  updated_at: string;
}

/**
 * 合并范围内的公司
 */
export interface ConsolidationCompany {
  id: string;
  scope_id: string; // 合并范围ID
  company_id: string; // 公司ID
  company_name: string; // 公司名称
  company_code: string; // 公司编码
  ownership_percentage: number; // 持股比例
  consolidation_percentage: number; // 合并比例
  is_parent: boolean; // 是否为母公司
  control_type: 'full_control' | 'joint_venture' | 'associate'; // 控制类型
  minority_interest: number; // 少数股东权益
  created_at: string;
}

/**
 * 添加公司到合并范围请求
 */
export interface AddCompanyToScopeRequest {
  scope_id: string;
  company_id: string;
  ownership_percentage: number;
  consolidation_percentage: number;
  control_type: 'full_control' | 'joint_venture' | 'associate';
}

// ============================================
// 二、内部交易抵消
// ============================================

/**
 * 抵消规则类型
 */
export type EliminationRuleType =
  | 'investment_in_subsidiary' // 投资抵消
  | 'intra_receivable_payable' // 内部往来抵消
  | 'intra_sales_purchase' // 内部购销抵消
  | 'intra_profit_loss' // 未实现利润抵消
  | 'intra_dividend' // 股利分配抵消
  | 'intra_loan' // 内部借款抵消
  | 'other'; // 其他

/**
 * 抵消规则状态
 */
export type EliminationRuleStatus = 'active' | 'inactive' | 'draft';

/**
 * 抵消规则
 */
export interface EliminationRule {
  id: string;
  scope_id: string; // 合并范围ID
  name: string; // 规则名称
  code: string; // 规则编码
  type: EliminationRuleType; // 规则类型
  description?: string; // 说明
  status: EliminationRuleStatus; // 状态

  // 抵消方向
  direction: 'debit' | 'credit' | 'both';

  // 借方科目（投资抵消时使用）
  debit_account_codes?: string[]; // 如：对子公司投资 1512

  // 贷方科目（投资抵消时使用）
  credit_account_codes?: string[]; // 如：子公司权益

  // 关联公司组
  company_pairs?: {
    from_company_id: string; // 交易方公司ID
    to_company_id: string; // 交易对方公司ID
  }[];

  // 自动抵消配置
  auto_elimination: boolean; // 是否自动抵消
  priority: number; // 执行优先级

  created_at: string;
  updated_at: string;
}

/**
 * 内部交易记录
 */
export interface InternalTransaction {
  id: string;
  transaction_no: string; // 交易编号
  transaction_date: string; // 交易日期
  period: string; // 会计期间

  // 交易双方
  from_company_id: string; // 交易方公司ID
  from_company_name: string;
  to_company_id: string; // 交易对方公司ID
  to_company_name: string;

  // 交易信息
  transaction_type: EliminationRuleType;
  description?: string;

  // 金额
  amount: number; // 交易金额
  currency: string; // 币种

  // 抵消状态
  elimination_status: 'pending' | 'eliminated' | 'partial' | 'not_applicable';
  eliminated_amount: number; // 已抵消金额
  remaining_amount: number; // 剩余未抵消金额

  // 关联凭证
  voucher_id?: string;
  elimination_voucher_id?: string; // 抵消凭证ID

  created_at: string;
}

// ============================================
// 三、合并报表
// ============================================

/**
 * 合并报表类型
 */
export type ConsolidationReportType =
  | 'consolidated_balance_sheet' // 合并资产负债表
  | 'consolidated_income_statement' // 合并利润表
  | 'consolidated_cash_flow' // 合并现金流量表
  | 'consolidated_statement_changes' // 合并所有者权益变动表
  | 'elimination_work_sheet'; // 抵消工作底稿

/**
 * 合并报表状态
 */
export type ConsolidationReportStatus = 'draft' | 'calculating' | 'completed' | 'published';

/**
 * 合并报表
 */
export interface ConsolidationReport {
  id: string;
  report_no: string; // 报表编号
  report_type: ConsolidationReportType;

  // 合并范围
  scope_id: string;
  scope_name: string;

  // 报表期间
  period: string; // YYYY-MM
  year: number;
  quarter?: number; // 季度（1-4）
  month?: number; // 月份（1-12）

  // 状态
  status: ConsolidationReportStatus;

  // 包含公司数
  company_count: number;
  eliminated_company_count: number; // 已抵消公司数

  // 金额信息
  total_assets?: number; // 资产总计
  total_liabilities?: number; // 负债合计
  total_equity?: number; // 所有者权益合计
  total_revenue?: number; // 营业收入
  total_profit?: number; // 利润总额
  net_profit?: number; // 净利润

  // 少数股东权益
  minority_interest?: number;
  归属于母公司净利润?: number;

  // 工作流状态
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;

  // 发布信息
  published_by?: string;
  published_at?: string;

  // 生成信息
  generated_by?: string;
  generated_at?: string;

  created_at: string;
  updated_at: string;
}

/**
 * 合并报表行项目
 */
export interface ConsolidationReportLine {
  id: string;
  report_id: string;
  line_no: number; // 行号
  item_code?: string; // 项目编码
  item_name: string; // 项目名称
  item_level: number; // 层级（用于分组）

  // 金额列（支持多列用于对比）
  current_period: number; // 本期金额
  prior_period?: number; // 上期金额（用于对比）

  // 公司分解
  company_breakdown?: {
    company_id: string;
    company_name: string;
    amount: number;
  }[];

  // 抵消分解
  elimination_breakdown?: {
    elimination_type: EliminationRuleType;
    amount: number;
  }[];

  // 计算公式（用于显示）
  formula?: string;
  notes?: string;
}

// ============================================
// 四、合并报表生成请求
// ============================================

/**
 * 生成合并报表请求
 */
export interface GenerateConsolidationReportRequest {
  scope_id: string; // 合并范围ID
  report_type: ConsolidationReportType;
  period: string; // YYYY-MM
  include_prior_period: boolean; // 是否包含上期数据
  auto_eliminate: boolean; // 是否自动抵消
}

/**
 * 抵消结果
 */
export interface EliminationResult {
  rule_id: string;
  rule_name: string;
  rule_type: EliminationRuleType;
  transaction_count: number; // 涉及交易笔数
  total_eliminated: number; // 总抵消金额
  success: boolean;
  error_message?: string;
}

/**
 * 合并报表生成结果
 */
export interface ConsolidationReportGenerateResult {
  report_id: string;
  report_no: string;
  status: ConsolidationReportStatus;
  elimination_results: EliminationResult[];
  generated_at: string;
  warnings?: string[];
}

// ============================================
// 五、查询参数
// ============================================

/**
 * 合并范围查询参数
 */
export interface ConsolidationScopeQueryParams {
  keyword?: string;
  status?: ConsolidationScopeStatus;
  consolidation_method?: string;
  page?: number;
  page_size?: number;
}

/**
 * 抵消规则查询参数
 */
export interface EliminationRuleQueryParams {
  scope_id: string;
  type?: EliminationRuleType;
  status?: EliminationRuleStatus;
  keyword?: string;
  page?: number;
  page_size?: number;
}

/**
 * 内部交易查询参数
 */
export interface InternalTransactionQueryParams {
  scope_id?: string;
  from_company_id?: string;
  to_company_id?: string;
  transaction_type?: EliminationRuleType;
  elimination_status?: string;
  period_from?: string;
  period_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * 合并报表查询参数
 */
export interface ConsolidationReportQueryParams {
  scope_id?: string;
  report_type?: ConsolidationReportType;
  period_from?: string;
  period_to?: string;
  status?: ConsolidationReportStatus;
  approval_status?: string;
  page?: number;
  page_size?: number;
}

// ============================================
// 六、公司架构类型
// ============================================

/**
 * 公司关系类型
 */
export type CompanyRelationType =
  | 'parent' // 母公司
  | 'subsidiary' // 子公司
  | 'associate' // 联营公司
  | 'joint_venture' // 合营公司
  | 'branch'; // 分公司

/**
 * 公司关系
 */
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

/**
 * 公司财务信息（用于合并）
 */
export interface CompanyFinancialData {
  company_id: string;
  company_name: string;
  period: string;

  // 资产负债表数据
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

  // 利润表数据
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_profit: number;
  profit_before_tax: number;
  net_profit: number;

  // 现金流量表数据
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_flow: number;
}

// ============================================
// 七、公司架构管理（用于合并报表）
// ============================================

/**
 * 公司架构树节点
 */
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

/**
 * 公司架构列表项
 */
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

/**
 * 创建公司关系请求
 */
export interface CreateCompanyRelationRequest {
  parent_company_id: string;
  child_company_id: string;
  relation_type: CompanyRelationType;
  ownership_percentage: number;
  control_percentage?: number;
  effective_date: string;
  expiry_date?: string;
}

/**
 * 更新公司关系请求
 */
export interface UpdateCompanyRelationRequest {
  ownership_percentage?: number;
  control_percentage?: number;
  expiry_date?: string;
  status?: 'active' | 'inactive';
}

/**
 * 公司关系查询参数
 */
export interface CompanyRelationQueryParams {
  company_id?: string;
  relation_type?: CompanyRelationType;
  status?: 'active' | 'inactive';
  keyword?: string;
  page?: number;
  page_size?: number;
}
